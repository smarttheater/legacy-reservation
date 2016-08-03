"use strict";
const BaseController_1 = require('./BaseController');
const Models_1 = require('../../common/models/Models');
const ReservationUtil_1 = require('../../common/models/Reservation/ReservationUtil');
const TicketTypeGroupUtil_1 = require('../../common/models/TicketTypeGroup/TicketTypeGroupUtil');
const log4js = require('log4js');
const fs = require('fs-extra');
const sendgrid = require('sendgrid');
const conf = require('config');
const moment = require('moment');
/**
 * 予約フローベースコントローラー
 */
class ReserveBaseController extends BaseController_1.default {
    processCancelSeats(reservationModel, cb) {
        let reservationIdsInSession = (reservationModel.reservationIds) ? reservationModel.reservationIds : [];
        let promises = [];
        // セッション中の予約リストを初期化
        reservationModel.reservationIds = [];
        // 仮予約を空席ステータスに戻す
        reservationIdsInSession.forEach((reservationIdInSession, index) => {
            promises.push(new Promise((resolve, reject) => {
                this.logger.debug('updating reservation status to avalilable..._id:', reservationIdInSession);
                Models_1.default.Reservation.update({
                    _id: reservationIdInSession,
                }, {
                    status: ReservationUtil_1.default.STATUS_AVAILABLE,
                }, (err, affectedRows) => {
                    // 失敗したとしても時間経過で消えるので放置
                    if (err) {
                    }
                    else {
                    }
                    resolve();
                });
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
    processFixPerformance(reservationModel, perfomanceId, cb) {
        // パフォーマンス取得
        this.logger.debug('searching performance... id:', perfomanceId);
        Models_1.default.Performance.findOne({
            _id: perfomanceId
        }, 'day start_time end_time is_mx4d film screen theater' // 必要な項目だけ指定すること
        )
            .populate('film', 'name name_en ticket_type_group image') // 必要な項目だけ指定すること
            .populate('screen', 'name name_en sections') // 必要な項目だけ指定すること
            .populate('theater', 'name name_en') // 必要な項目だけ指定すること
            .exec((err, performanceDocument) => {
            if (err) {
                cb(err, reservationModel);
            }
            else {
                // 内部以外は、上映開始20分過ぎていたらはじく
                if (!reservationModel.staff) {
                    let now = moment().add(-20, 'minutes');
                    if (performanceDocument.get('day') === now.format('YYYYMMDD')) {
                        if (performanceDocument.get('start') < now.format('HHmm')) {
                            return cb(new Error('You cannot reserve this performance.'), reservationModel);
                        }
                    }
                    else if (performanceDocument.get('day') < now.format('YYYYMMDD')) {
                        return cb(new Error('You cannot reserve this performance.'), reservationModel);
                    }
                }
                // 券種取得
                Models_1.default.TicketTypeGroup.findOne({
                    _id: performanceDocument.get('film').get('ticket_type_group')
                }, (err, ticketTypeGroupDocument) => {
                    reservationModel.reservationIds = [];
                    // 券種リストは、予約する主体によって異なる
                    // 内部関係者の場合
                    if (reservationModel.staff) {
                        reservationModel.ticketTypes = TicketTypeGroupUtil_1.default.getOne4staff();
                    }
                    else if (reservationModel.sponsor) {
                        reservationModel.ticketTypes = TicketTypeGroupUtil_1.default.getOne4sponsor();
                    }
                    else if (reservationModel.member) {
                        reservationModel.ticketTypes = [];
                        for (let ticketType of ticketTypeGroupDocument.get('types')) {
                            if (ticketType.get('code') === TicketTypeGroupUtil_1.default.TICKET_TYPE_CODE_ADULTS) {
                                reservationModel.ticketTypes.push(ticketType);
                            }
                        }
                    }
                    else {
                        reservationModel.ticketTypes = [];
                        for (let ticketType of ticketTypeGroupDocument.get('types')) {
                            switch (ticketType.get('code')) {
                                // 学生当日は、当日だけ
                                case TicketTypeGroupUtil_1.default.TICKET_TYPE_CODE_STUDENTS_ON_THE_DAY:
                                    if (moment().format('YYYYMMDD') === performanceDocument.get('day')) {
                                        reservationModel.ticketTypes.push(ticketType);
                                    }
                                    break;
                                case TicketTypeGroupUtil_1.default.TICKET_TYPE_CODE_STUDENTS:
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
    processFixSeats(reservationModel, reservationIds, cb) {
        let reservationIdsInSession = reservationModel.reservationIds;
        if (reservationIds.length < 1) {
            cb(new Error('座席が選択されていません'), reservationModel);
        }
        else {
            // 仮押さえ
            // まず仮押さえしてから、仮押さえキャンセル
            let promises = [];
            // セッション中の予約リストを初期化
            reservationModel.reservationIds = [];
            // 仮予約解除の場合、空席ステータスに戻す(redis中の情報にあって、新たな指定リストにない座席コード)
            reservationIdsInSession.forEach((reservationIdInSession, index) => {
                let reservation = reservationModel.getReservation(reservationIdInSession);
                if (reservationIds.indexOf(reservationIdInSession) >= 0) {
                }
                else {
                    promises.push(new Promise((resolve, reject) => {
                        this.logger.debug('updating reservation status to avalilable..._id:', reservationIdInSession);
                        Models_1.default.Reservation.update({
                            _id: reservationIdInSession,
                        }, {
                            status: ReservationUtil_1.default.STATUS_AVAILABLE,
                        }, (err, affectedRows) => {
                            // 失敗したとしても時間経過で消えるので放置
                            if (err) {
                            }
                            else {
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
                }
                else {
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
                            status: ReservationUtil_1.default.STATUS_TEMPORARY,
                            member: (reservationModel.member) ? reservationModel.member._id : null,
                            sponsor: (reservationModel.sponsor) ? reservationModel.sponsor._id : null,
                            staff: (reservationModel.staff) ? reservationModel.staff._id : null // 誰が仮予約中かも分かるように
                        };
                        if (reservationModel.staff) {
                            update['staff'] = reservationModel.staff._id;
                        }
                        else if (reservationModel.sponsor) {
                            update['sponsor'] = reservationModel.sponsor._id;
                        }
                        else if (reservationModel.member) {
                            update['member'] = reservationModel.member._id;
                        }
                        else {
                        }
                        this.logger.debug('updating reservation status to temporary...reservationId:', reservationId);
                        Models_1.default.Reservation.findOneAndUpdate({
                            _id: reservationId,
                            status: ReservationUtil_1.default.STATUS_AVAILABLE // 空席ステータスのみ、新規仮登録できる(ここはポイントなので要注意！！！)
                        }, update, {
                            new: true,
                        }, (err, reservationDocument) => {
                            if (err) {
                            }
                            else {
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
     * 予約プロセス用のロガーを設定する
     * 1決済管理番号につき、1ログファイル
     *
     * @param {string} paymentNo 予約番号
     */
    setProcessLogger(paymentNo, cb) {
        let env = process.env.NODE_ENV || 'dev';
        let moment = require('moment');
        let logDir = `${__dirname}/../../../logs/${env}/frontend/reserve/${moment().format('YYYYMMDD')}`;
        fs.mkdirs(logDir, (err) => {
            if (err) {
            }
            else {
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
    /**
     * 予約完了メールを送信する
     */
    sendCompleteEmail(to, reservationDocuments, cb) {
        this.res.render('email/reserveComplete', {
            layout: false,
            reservationDocuments: reservationDocuments
        }, (err, html) => {
            if (err) {
                cb(err, null);
            }
            else {
                let _sendgrid = sendgrid(conf.get('sendgrid_username'), conf.get('sendgrid_password'));
                let email = new _sendgrid.Email({
                    to: to,
                    from: 'noreply@devtiffwebapp.azurewebsites.net',
                    subject: `[TIFF][${process.env.NODE_ENV}] 予約完了`,
                    html: html
                });
                // add barcodes
                for (let reservationDocument of reservationDocuments) {
                    let reservationId = reservationDocument._id.toString();
                    // email.addFile({
                    //     filename: `barcode_${reservationId}.png`,
                    //     contentType: 'image/png',
                    //     cid: `barcode_${reservationId}`,
                    //     url: this.router.build('reserve.barcode', {token: token, reservationId:reservationId})
                    // });
                    email.addFile({
                        filename: `QR_${reservationId}.png`,
                        contentType: 'image/png',
                        cid: `qrcode_${reservationId}`,
                        content: ReservationUtil_1.default.createQRCode(reservationId)
                    });
                }
                this.logger.info('sending an email...email:', email);
                _sendgrid.send(email, (err, json) => {
                    this.logger.info('an email sent.', err, json);
                    cb(err, json);
                });
            }
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ReserveBaseController;
