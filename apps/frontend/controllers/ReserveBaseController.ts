import BaseController from './BaseController';
import Util from '../../common/Util/Util';

import Models from '../../common/models/Models';
import ReservationUtil from '../../common/models/Reservation/ReservationUtil';
import TicketTypeGroupUtil from '../../common/models/TicketTypeGroup/TicketTypeGroupUtil';

import ReservationModel from '../models/Reserve/ReservationModel';

import log4js = require('log4js');
import fs = require('fs-extra');
import sendgrid = require('sendgrid')
import conf = require('config')
import util = require('util');
import mongoose = require('mongoose');
import moment = require('moment');
import request = require('request');

/**
 * 予約フローベースコントローラー
 */
export default class ReserveBaseController extends BaseController {
    protected processCancelSeats(reservationModel: ReservationModel, cb: (err: Error, reservationModel: ReservationModel) => void) {

        let reservationIdsInSession = (reservationModel.reservationIds) ? reservationModel.reservationIds : [];

        let promises: Array<Promise<Function>> = [];

        // セッション中の予約リストを初期化
        reservationModel.reservationIds = [];

        // 仮予約を空席ステータスに戻す
        reservationIdsInSession.forEach((reservationIdInSession, index) => {

            promises.push(new Promise((resolve, reject) => {

                this.logger.debug('updating reservation status to avalilable..._id:', reservationIdInSession);
                Models.Reservation.update(
                    {
                        _id: reservationIdInSession,
                    },
                    {
                        status: ReservationUtil.STATUS_AVAILABLE,
                    },
                    (err, affectedRows) => {

                        // 失敗したとしても時間経過で消えるので放置
                        if (err) {
                        } else {
                        }

                        resolve();
                    }
                );

            }));
        });

        Promise.all(promises).then(() => {
            cb(null, reservationModel);

        }, (err) => {
            cb(err, reservationModel);

        });

    }

    /**
     * パフォーマンスをFIXするプロセス
     * パフォーマンスIDから、パフォーマンスを検索し、その後プロセスに必要な情報をreservationModelに追加する
     */
    protected processFixPerformance(reservationModel: ReservationModel, perfomanceId: string, cb: (err: Error, reservationModel: ReservationModel) => void) {

        // パフォーマンス取得
        this.logger.debug('searching performance... id:', perfomanceId);
        Models.Performance.findOne(
            {
                _id: perfomanceId
            },
            'day start_time end_time is_mx4d film screen theater' // 必要な項目だけ指定すること
        )
        .populate('film', 'name name_en ticket_type_group image') // 必要な項目だけ指定すること
        .populate('screen', 'name name_en sections') // 必要な項目だけ指定すること
        .populate('theater', 'name name_en') // 必要な項目だけ指定すること
        .exec((err, performanceDocument) => {

            if (err) {
                cb(err, reservationModel);
            } else {

                // 内部以外は、上映開始20分過ぎていたらはじく
                if (!reservationModel.staff) {
                    let now = moment().add(-20, 'minutes');
                    if (performanceDocument.get('day') === now.format('YYYYMMDD')) {
                        if (performanceDocument.get('start') < now.format('HHmm')) {
                            return cb(new Error('You cannot reserve this performance.'), reservationModel);

                        }

                    } else if (performanceDocument.get('day') < now.format('YYYYMMDD')) {
                        return cb(new Error('You cannot reserve this performance.'), reservationModel);

                    }

                }



                // 券種取得
                Models.TicketTypeGroup.findOne(
                    {
                        _id: performanceDocument.get('film').get('ticket_type_group')
                    },
                (err, ticketTypeGroupDocument) => {


                    reservationModel.reservationIds = [];



                    // 券種リストは、予約する主体によって異なる

                    // 内部関係者の場合
                    if (reservationModel.staff) {
                        reservationModel.ticketTypes = TicketTypeGroupUtil.getOne4staff();

                    // 外部関係者の場合
                    } else if (reservationModel.sponsor) {
                        reservationModel.ticketTypes = TicketTypeGroupUtil.getOne4sponsor();

                    // メルマガ当選者の場合、一般だけ
                    } else if (reservationModel.member) {
                        reservationModel.ticketTypes = [];

                        for (let ticketType of ticketTypeGroupDocument.get('types')) {
                            if (ticketType.get('code') === TicketTypeGroupUtil.TICKET_TYPE_CODE_ADULTS) {
                                reservationModel.ticketTypes.push(ticketType);
                            }
                        }

                    // 一般の場合
                    // 当日窓口、電話予約の場合は、一般と同様の券種
                    // TODO 電話予約の場合は、手数料が1席につき150円(コンビニ分)
                    } else {
                        reservationModel.ticketTypes = [];

                        for (let ticketType of ticketTypeGroupDocument.get('types')) {
                            switch (ticketType.get('code')) {
                                // 学生当日は、当日だけ
                                case TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS_ON_THE_DAY:
                                    if (moment().format('YYYYMMDD') === performanceDocument.get('day')) {
                                        reservationModel.ticketTypes.push(ticketType);
                                    }

                                    break;

                                case TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS:
                                    if (moment().format('YYYYMMDD') !== performanceDocument.get('day')) {
                                        reservationModel.ticketTypes.push(ticketType);
                                    }

                                    break;

                                default:
                                    reservationModel.ticketTypes.push(ticketType);

                                    break;
                            }
                        }

                    }





                    // パフォーマンス情報を保管
                    reservationModel.performance = {
                        _id: performanceDocument.get('_id'),
                        day: performanceDocument.get('day'),
                        start_time: performanceDocument.get('start_time'),
                        end_time: performanceDocument.get('end_time'),
                        is_mx4d: performanceDocument.get('is_mx4d'),
                        theater: {
                            _id: performanceDocument.get('theater').get('_id'),
                            name: performanceDocument.get('theater').get('name'),
                            name_en: performanceDocument.get('theater').get('name_en'),
                        },
                        screen: {
                            _id: performanceDocument.get('screen').get('_id'),
                            name: performanceDocument.get('screen').get('name'),
                            name_en: performanceDocument.get('screen').get('name_en'),
                            sections: performanceDocument.get('screen').get('sections'),
                        },
                        film: {
                            _id: performanceDocument.get('film').get('_id'),
                            name: performanceDocument.get('film').get('name'),
                            name_en: performanceDocument.get('film').get('name_en'),
                            image: performanceDocument.get('film').get('image')
                        }
                    };





                    // スクリーン座席表HTMLを保管(apiで取得)
                    // TODO ひとまず固定だが、最終的にはパフォーマンスに応じて適切なスクリーンを入れる
                    fs.readFile(`${__dirname}/../../common/views/screens/map.ejs`, 'utf8', (err, data) => {
                        reservationModel.screenHtml = data;

                        cb(null, reservationModel);

                    });
                });

            }
        });
    }

    /**
     * 座席をFIXするプロセス
     */
    protected processFixSeats(reservationModel: ReservationModel, reservationIds: Array<string>, cb: (err: Error, reservationModel: ReservationModel) => void) {

        let reservationIdsInSession = reservationModel.reservationIds;

        if (reservationIds.length < 1) {
            cb(new Error('座席が選択されていません'), reservationModel);
        } else {

            // 仮押さえ
            // まず仮押さえしてから、仮押さえキャンセル
            let promises: Array<Promise<Function>> = [];

            // セッション中の予約リストを初期化
            reservationModel.reservationIds = [];


            // 仮予約解除の場合、空席ステータスに戻す(redis中の情報にあって、新たな指定リストにない座席コード)
            reservationIdsInSession.forEach((reservationIdInSession, index) => {
                let reservation = reservationModel.getReservation(reservationIdInSession);

                if (reservationIds.indexOf(reservationIdInSession) >= 0) {

                } else {
                    promises.push(new Promise((resolve, reject) => {

                        this.logger.debug('updating reservation status to avalilable..._id:', reservationIdInSession);
                        Models.Reservation.update(
                            {
                                _id: reservationIdInSession,
                            },
                            {
                                status: ReservationUtil.STATUS_AVAILABLE,
                            },
                        (err, affectedRows) => {

                            // 失敗したとしても時間経過で消えるので放置
                            if (err) {
                            } else {
                            }

                            resolve();
                        });

                    }));
                }
            });


            // 新たな座席指定と、既に仮予約済みの座席コードについて
            reservationIds.forEach((reservationId, index) => {

                // すでに仮予約済みであれば、セッションに加えるだけ
                if (reservationIdsInSession.indexOf(reservationId) >= 0) {
                    promises.push(new Promise((resolve, reject) => {
                        reservationModel.reservationIds.push(reservationId);

                        resolve();
                    }));

                } else {

                    // 新規仮予約
                    /***********************************************
                     ***********************************************
                     ***********************************************
                     * ここが今回の肝です！！！
                     ************************************************
                     ************************************************
                     ************************************************/
                    promises.push(new Promise((resolve, reject) => {
                        let update = {
                            status: ReservationUtil.STATUS_TEMPORARY,
                            mvtk_kiin_cd: (reservationModel.mvtkMemberInfoResult) ? reservationModel.mvtkMemberInfoResult.kiinCd : null, // 誰が仮予約中かも分かるように
                            member: (reservationModel.member) ? reservationModel.member._id : null, // 誰が仮予約中かも分かるように
                            sponsor: (reservationModel.sponsor) ? reservationModel.sponsor._id : null, // 誰が仮予約中かも分かるように
                            staff: (reservationModel.staff) ? reservationModel.staff._id : null // 誰が仮予約中かも分かるように
                        };


                        if (reservationModel.staff) {
                            update['staff'] = reservationModel.staff._id;
                        } else if (reservationModel.sponsor) {
                            update['sponsor'] = reservationModel.sponsor._id;
                        } else if (reservationModel.member) {
                            update['member'] = reservationModel.member._id;
                        } else {
                        }


                        this.logger.debug('updating reservation status to temporary...reservationId:', reservationId);
                        Models.Reservation.findOneAndUpdate(
                            {
                                _id: reservationId,
                                status: ReservationUtil.STATUS_AVAILABLE // 空席ステータスのみ、新規仮登録できる(ここはポイントなので要注意！！！)
                            },
                            update,
                            {
                                new: true,
                            },
                        (err, reservationDocument) => {

                            if (err) {
                                reject();

                            } else {
                                if (reservationDocument) {
                                    // ステータス更新に成功したらセッションに保管
                                    reservationModel.reservationIds.push(reservationDocument.get('_id'));
                                    reservationModel.setReservation(reservationDocument.get('_id'), {
                                        _id: reservationDocument.get('_id'),
                                        status: reservationDocument.get('status'),
                                        seat_code: reservationDocument.get('seat_code'),
                                        seat_grade_name: reservationDocument.get('seat_grade_name'),
                                        seat_grade_name_en: reservationDocument.get('seat_grade_name_en'),
                                        seat_grade_additional_charge: reservationDocument.get('seat_grade_additional_charge'),
                                    });
                                }

                                resolve();
                            }

                        });

                    }));
                }

            });



            Promise.all(promises).then(() => {
                cb(null, reservationModel);

            }, (err) => {
                cb(err, reservationModel);

            });
        }

    }

    /**
     * 購入番号から全ての予約を完了にする
     * 
     * @param {string} paymentNo 購入番号
     * @param {Object} update 追加更新パラメータ
     */
    protected processFixReservations(paymentNo: string, reservationIds: Array<string>, update: Object, cb: (err: Error) => void): void {
        let promises = [];

        update['status'] = ReservationUtil.STATUS_RESERVED;
        update['updated_user'] = 'ReserveBaseController';

        // 予約完了ステータスへ変更
        for (let reservationId of reservationIds) {
            promises.push(new Promise((resolve, reject) => {

                this.logger.info('updating reservation by id...update:', update);
                Models.Reservation.update(
                    {
                        _id: reservationId
                    },
                    update,
                    (err, raw) => {
                        this.logger.info('reservation updated.', err, raw);

                        if (err) {
                            reject();

                        } else {
                            resolve();

                        }

                    }
                );

            }));
        };

        Promise.all(promises).then(() => {
            this.logger.info('creating reservationEmailCue...');
            Models.ReservationEmailCue.findOneAndUpdate(
                {
                    payment_no: paymentNo
                },
                {
                    is_sent: false
                },
                {
                    upsert: true,
                    new: true
                },
                (err, reservationEmailCueDocument) => {
                    this.logger.info('reservationEmailCue created.', err, reservationEmailCueDocument);
                    if (err) {
                        // 失敗してもスルー(ログと運用でなんとかする)

                    }

                    cb(null);

                }
            );

        }, (err) => {
            cb(new Error('some reservations not updated.'));

        });
    }

    /**
     * 予約プロセス用のロガーを設定する
     * 1決済管理番号につき、1ログファイル
     * 
     * @param {string} paymentNo 予約番号
     */
    protected setProcessLogger(paymentNo: string, cb: () => void) {
        Util.getReservationLogger(paymentNo, (err, logger) => {
            if (err) {
                // 失敗したとしても処理は続行
                // ログファイルがデフォルトになってしまうが仕方ない

            } else {
                this.logger = logger;

            }
    
            cb();
        });

    }

    /**
     * 購入管理番号生成
     *
     * @return {string}
     */
    protected createPaymentNo(cb: (no: string) => void): void {
        Models.Sequence.findOneAndUpdate(
            {
                target: 'payment_no'
            },
            {
                $inc: {
                    no: 1
                }
            },
            {
                new: true
            },
            (err, sequenceDocument) => {
                let no: number = sequenceDocument.get('no');
                let paymentNo = `${no}${Util.getCheckDigit(no)}`;
                this.logger.debug('paymentNo:', paymentNo);
                cb(paymentNo);

            }

        );

    }
}
