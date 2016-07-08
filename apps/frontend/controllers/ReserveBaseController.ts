import BaseController from './BaseController';
import Util from '../../common/Util/Util';

import Models from '../../common/models/Models';
import ReservationUtil from '../../common/models/Reservation/ReservationUtil';

import ReservationModel from '../models/Reserve/ReservationModel';
import ReservationResultModel from '../models/Reserve/ReservationResultModel';

import log4js = require('log4js');
import fs = require('fs-extra');
import sendgrid = require('sendgrid')
import conf = require('config')
import util = require('util');

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
            'day start_time end_time film screen theater' // 必要な項目だけ指定すること
        )
        .populate('film', 'name name_en') // 必要な項目だけ指定すること
        .populate('screen', 'name name_en sections') // 必要な項目だけ指定すること
        .populate('theater', 'name name_en') // 必要な項目だけ指定すること
        .exec((err, performanceDocument) => {

            if (err) {
                cb(err, reservationModel);
            } else {

                reservationModel.reservationIds = [];



                // 座席コードごとの券種選択肢リスト
                // TODO ここが、予約する主体によって異なってくる
                // それをどう実装するか
                let ticketChoicesBySeatCode = {};
                let seatDocuments = performanceDocument.get('screen').get('sections')[0].get('seats');

                // 内部関係者の場合
                if (reservationModel.staff) {
                    for (let seatDocument of seatDocuments) {
                        // TODO 内部関係者の場合、ひとまず券種リストを固定にしておく
                        // ticketChoicesBySeatCode[seatDocument.get('code')] = seatDocument.get('tickets');
                        ticketChoicesBySeatCode[seatDocument.get('code')] = [
                            {
                                type: '01',
                                name: '無料',
                                name_en: 'free',
                                price: 0,
                            },
                            {
                                type: '02',
                                name: '有料',
                                name_en: 'charge',
                                price: 1500,
                            },
                        ];
                    }
                    reservationModel.ticketChoicesBySeatCode = ticketChoicesBySeatCode;

                // 外部関係者の場合
                } else if (reservationModel.sponsor) {
                    for (let seatDocument of seatDocuments) {
                        // TODO 外部関係者の場合、ひとまず券種リストを固定にしておく
                        // ticketChoicesBySeatCode[seatDocument.get('code')] = seatDocument.get('tickets');
                        ticketChoicesBySeatCode[seatDocument.get('code')] = [
                            {
                                type: '01',
                                name: '一般',
                                name_en: 'adult',
                                price: 1500,
                            }
                        ];
                    }
                    reservationModel.ticketChoicesBySeatCode = ticketChoicesBySeatCode;

                // 一般、メルマガ当選者、の場合
                } else {
                    for (let seatDocument of seatDocuments) {
                        // TODO いったん固定
                        // ticketChoicesBySeatCode[seatDocument.get('code')] = seatDocument.get('tickets');
                        ticketChoicesBySeatCode[seatDocument.get('code')] = [
                            {
                                type: '01',
                                name: '一般',
                                name_en: 'adult',
                                price: 1500,
                            },
                            {
                                type: '02',
                                name: '小人',
                                name_en: 'child',
                                price: 900,
                            }
                        ];
                    }
                    reservationModel.ticketChoicesBySeatCode = ticketChoicesBySeatCode;

                }



                // パフォーマンス情報を保管
                reservationModel.performance = {
                    _id: performanceDocument.get('_id'),
                    day: performanceDocument.get('day'),
                    start_time: performanceDocument.get('start_time'),
                    end_time: performanceDocument.get('end_time'),
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
                    }
                };


                // スクリーン座席表HTMLを保管
                // TODO ひとまず固定だが、最終的にはパフォーマンスに応じて適切なスクリーンを入れる
                fs.readFile(`${__dirname}/../views/screens/map.ejs`, 'utf8', (err, data) => {
                    reservationModel.screenHtml = data;

                    cb(null, reservationModel);

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
                    promises.push(new Promise((resolve, reject) => {
                        let update = {
                            status: ReservationUtil.STATUS_TEMPORARY
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
                                // TODO ログ出力(後で追えるように)

                            } else {
                                if (reservationDocument) {
                                    // ステータス更新に成功したらセッションに保管
                                    reservationModel.reservationIds.push(reservationDocument.get('_id'));
                                    reservationModel.setReservation(reservationDocument.get('_id'), {
                                        _id: reservationDocument.get('_id'),
                                        status: reservationDocument.get('status'),
                                        seat_code: reservationDocument.get('seat_code'),
                                        performance: reservationDocument.get('performance'),
                                    });
                                }
                            }

                            resolve();
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
     * 予約全体をFIXするプロセス
     */
    protected processFixAll(reservationModel: ReservationModel, cb: (err: Error, reservationModel: ReservationModel) => void) {

        reservationModel.reservedDocuments = [];

        let promises = [];
        reservationModel.reservationIds.forEach((reservationId, index) => {
            let reservation = reservationModel.getReservation(reservationId);

            promises.push(new Promise((resolve, reject) => {

                this.logger.info('updating reservation status to STATUS_RESERVED..._id:', reservationId);
                Models.Reservation.findOneAndUpdate(
                    {
                        _id: reservationId,
                    },
                    {
                        payment_no: reservationModel.paymentNo,
                        status: ReservationUtil.STATUS_RESERVED,
                        performance: reservationModel.performance._id,
                        performance_day: reservationModel.performance.day,
                        performance_start_time: reservationModel.performance.start_time,
                        performance_end_time: reservationModel.performance.end_time,
                        theater: reservationModel.performance.theater._id,
                        theater_name: reservationModel.performance.theater.name,
                        screen: reservationModel.performance.screen._id,
                        screen_name: reservationModel.performance.screen.name,
                        film: reservationModel.performance.film._id,
                        film_name: reservationModel.performance.film.name,

                        purchaser_last_name: (reservationModel.profile) ? reservationModel.profile.last_name : null,
                        purchaser_first_name: (reservationModel.profile) ? reservationModel.profile.first_name : null,
                        purchaser_email: (reservationModel.profile) ? reservationModel.profile.email : null,
                        purchaser_tel: (reservationModel.profile) ? reservationModel.profile.tel : null,

                        ticket_type: reservation.ticket_type,
                        ticket_name: reservation.ticket_name,
                        ticket_name_en: reservation.ticket_name_en,
                        ticket_price: reservation.ticket_price,

                        watcher_name: reservation.watcher_name,

                        member: (reservationModel.member) ? reservationModel.member._id : null,
                        member_user_id: (reservationModel.member) ? reservationModel.member.user_id : null,

                        sponsor: (reservationModel.sponsor) ? reservationModel.sponsor._id : null,
                        sponsor_user_id: (reservationModel.sponsor) ? reservationModel.sponsor.user_id : null,
                        sponsor_name: (reservationModel.sponsor) ? reservationModel.sponsor.name : null,
                        sponsor_email: (reservationModel.sponsor) ? reservationModel.sponsor.email : null,

                        staff: (reservationModel.staff) ? reservationModel.staff._id : null,
                        staff_user_id: (reservationModel.staff) ? reservationModel.staff.user_id : null,
                        staff_name: (reservationModel.staff) ? reservationModel.staff.name : null,
                        staff_email: (reservationModel.staff) ? reservationModel.staff.email : null,
                        staff_department_name: (reservationModel.staff) ? reservationModel.staff.department_name : null,
                        staff_tel: (reservationModel.staff) ? reservationModel.staff.tel : null,
                        staff_signature: (reservationModel.staff) ? reservationModel.staff.signature : null,

                        updated_user: this.constructor.toString(),
                    },
                    {
                        new: true
                    },
                (err, reservationDocument) => {
                    this.logger.info('STATUS_TEMPORARY to STATUS_RESERVED processed.', err, reservationDocument);

                    if (err) {
                        // TODO ログ出力

                    } else {
                        // ステータス更新に成功したらリストに追加
                        reservationModel.reservedDocuments.push(reservationDocument);

                        resolve();

                    }

                });

            }));
        });

        Promise.all(promises).then(() => {
            this.logger.info('fix all success.');

            // TODO QR作成？

            // TODO メール送信？
            if (reservationModel.profile.email) {
                let _sendgrid = sendgrid(conf.get<string>('sendgrid_username'), conf.get<string>('sendgrid_password'));
                let html = `
<html>
    <body>
        <h1>[TIFF][${process.env.NODE_ENV}] 予約完了</h1>
        <p>予約内容は以下の通りです。</p>
        <p>
        ${util.inspect(reservationModel.reservedDocuments, { showHidden: true, depth: null })}
        </p>
    </body>
</html>
`;
                let email = new _sendgrid.Email({
                    to: reservationModel.profile.email,
                    from: 'noreply@devtiffwebapp.azurewebsites.net',
                    subject: `[TIFF][${process.env.NODE_ENV}] 予約完了`,
                    html: html
                });
                this.logger.info('sending an email...email:', email);
                _sendgrid.send(email, (err, json) => {
                    this.logger.info('an email sent.', err, json);
                    if (err) {
                        // TODO log
                    }

                    cb(null, reservationModel);

                });

            } else {
                cb(null, reservationModel);

            }

        }, (err) => {
            this.logger.error('fix all failure.', err);
            cb(err, reservationModel);

        });

    }

    /**
     * 予約プロセス用のロガーを設定する
     * 1決済管理番号につき、1ログファイル
     * 
     * @param {string} paymentNo 予約番号
     */
    protected setProcessLogger(paymentNo: string, cb: () => any) {
        let env = process.env.NODE_ENV || 'dev';
        let moment = require('moment');
        let logDir = `${__dirname}/../../../logs/${env}/frontend/reserve/${moment().format('YYYYMMDD')}`;

        fs.mkdirs(logDir, (err) => {
            if (err) {
                // 失敗したとしても処理は続行
                // ログファイルがデフォルトになってしまうが仕方ない

            } else {
                log4js.configure({
                    appenders: [
                        {
                            category: 'reserve',
                            type: 'dateFile',
                            filename: `${logDir}/${paymentNo}.log`,
                            pattern: '-yyyy-MM-dd',
                            backups: 3
                        },
                        {
                            type: 'console'
                        }
                    ],
                    levels: {
                        reserve: 'ALL'
                    },
                    replaceConsole: true
                });

                this.logger = log4js.getLogger('reserve');

                cb();

            }
        });
    }
}
