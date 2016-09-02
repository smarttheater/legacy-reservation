"use strict";
const ReserveBaseController_1 = require('../../ReserveBaseController');
const Util_1 = require('../../../../common/Util/Util');
const GMOUtil_1 = require('../../../../common/Util/GMO/GMOUtil');
const Models_1 = require('../../../../common/models/Models');
const ReservationUtil_1 = require('../../../../common/models/Reservation/ReservationUtil');
const ReservationModel_1 = require('../../../models/Reserve/ReservationModel');
const GMOResultModel_1 = require('../../../models/Reserve/GMOResultModel');
const GMONotificationModel_1 = require('../../../models/Reserve/GMONotificationModel');
const GMONotificationResponseModel_1 = require('../../../models/Reserve/GMONotificationResponseModel');
const moment = require('moment');
const conf = require('config');
const GMOReserveCreditController_1 = require('./Credit/GMOReserveCreditController');
const GMOReserveCvsController_1 = require('./Cvs/GMOReserveCvsController');
class GMOReserveController extends ReserveBaseController_1.default {
    /**
     * GMO決済を開始する
     */
    start() {
        let token = this.req.params.token;
        ReservationModel_1.default.find(token, (err, reservationModel) => {
            if (err)
                return this.next(new Error(this.req.__('Message.Expired')));
            // 予約情報セッション削除
            reservationModel.remove(() => {
                // 予約プロセス固有のログファイルをセット
                this.setProcessLogger(reservationModel.paymentNo, () => {
                    // GMOへ遷移画面
                    this.res.locals.shopId = conf.get('gmo_payment_shop_id');
                    this.res.locals.orderID = reservationModel.paymentNo; // 27桁まで(予約番号を使用)
                    this.res.locals.amount = reservationModel.getTotalCharge().toString();
                    this.res.locals.dateTime = moment(reservationModel.purchasedAt).format('YYYYMMDDHHmmss');
                    this.res.locals.useCredit = (reservationModel.paymentMethod === GMOUtil_1.default.PAY_TYPE_CREDIT) ? '1' : '0';
                    this.res.locals.useCvs = (reservationModel.paymentMethod === GMOUtil_1.default.PAY_TYPE_CVS) ? '1' : '0';
                    this.res.locals.shopPassString = GMOUtil_1.default.createShopPassString(conf.get('gmo_payment_shop_id'), this.res.locals.orderID, this.res.locals.amount, conf.get('gmo_payment_shop_password'), this.res.locals.dateTime);
                    this.logger.info('redirecting to GMO payment...');
                    this.res.render('gmo/reserve/start');
                });
            });
        });
    }
    /**
     * GMOからの結果受信
     * GMOで何かしらエラーが発生して「決済をやめる」ボタンから遷移してくることもある
     */
    result() {
        let gmoResultModel = GMOResultModel_1.default.parse(this.req.body);
        let paymentNo = gmoResultModel.OrderID;
        // 予約プロセス固有のログファイルをセット
        this.setProcessLogger(paymentNo, () => {
            this.logger.info('gmoResultModel is', gmoResultModel);
            // エラー結果の場合
            if (gmoResultModel.ErrCode) {
                // 空席に戻す
                this.logger.info('finding reservations...payment_no:', paymentNo);
                Models_1.default.Reservation.find({
                    payment_no: paymentNo
                }, 'total_charge', (err, reservations) => {
                    this.logger.info('reservations found.', err, reservations.length);
                    if (err)
                        return this.next(new Error(this.req.__('Message.UnexpectedError')));
                    if (reservations.length === 0)
                        return this.next(new Error(this.req.__('Message.NotFound')));
                    // 利用金額の整合性
                    this.logger.info('Amount must be ', reservations[0].get('total_charge'));
                    if (parseInt(gmoResultModel.Amount) !== reservations[0].get('total_charge')) {
                        return this.next(new Error(this.req.__('Message.UnexpectedError')));
                    }
                    // キャンセル
                    let promises = reservations.map((reservation) => {
                        return new Promise((resolve, reject) => {
                            this.logger.info('removing reservation...', reservation.get('_id'));
                            reservation.remove((err) => {
                                this.logger.info('reservation removed.', reservation.get('_id'), err);
                                if (err)
                                    return reject(err);
                                resolve();
                            });
                        });
                    });
                    Promise.all(promises).then(() => {
                        this.res.render('gmo/reserve/cancel');
                    }, (err) => {
                        this.res.render('gmo/reserve/cancel');
                    });
                });
            }
            else {
                // 決済方法によって振り分け
                switch (gmoResultModel.PayType) {
                    case GMOUtil_1.default.PAY_TYPE_CREDIT:
                        this.logger.info('starting GMOReserveCreditController.result...');
                        let creditController = new GMOReserveCreditController_1.default(this.req, this.res, this.next);
                        creditController.logger = this.logger;
                        creditController.result(gmoResultModel);
                        break;
                    case GMOUtil_1.default.PAY_TYPE_CVS:
                        this.logger.info('starting GMOReserveCsvController.result...');
                        let cvsController = new GMOReserveCvsController_1.default(this.req, this.res, this.next);
                        cvsController.logger = this.logger;
                        cvsController.result(gmoResultModel);
                        break;
                    default:
                        this.next(new Error(this.req.__('Message.UnexpectedError')));
                        break;
                }
            }
        });
    }
    /**
     * GMO結果通知受信
     *
     * お客様は、受信したHTTPリクエストに対するHTTPレスポンスが必要となります。
     * 返却値については、以下のいずれか
     * 0：受信OK ／ 1：受信失敗
     *
     * タイムアウトについて
     * 結果通知プログラム機能によって、指定URLへデータ送信を行った場合に15秒以内に返信が無いとタイムアウトとして処理を行います。
     * 加盟店様側からの正常応答が確認出来なかった場合は約60分毎に5回再送いたします。
     *
     */
    notify() {
        let gmoNotificationModel = GMONotificationModel_1.default.parse(this.req.body);
        let paymenyNo = gmoNotificationModel.OrderID;
        // 予約プロセス固有のログファイルをセット
        this.setProcessLogger(paymenyNo, () => {
            this.logger.info('gmoNotificationModel is', gmoNotificationModel);
            switch (gmoNotificationModel.PayType) {
                case GMOUtil_1.default.PAY_TYPE_CREDIT:
                    this.logger.info('starting GMOReserveCreditController.notify...');
                    let creditController = new GMOReserveCreditController_1.default(this.req, this.res, this.next);
                    creditController.logger = this.logger;
                    creditController.notify(gmoNotificationModel);
                    break;
                case GMOUtil_1.default.PAY_TYPE_CVS:
                    this.logger.info('starting GMOReserveCsvController.notify...');
                    let cvsController = new GMOReserveCvsController_1.default(this.req, this.res, this.next);
                    cvsController.logger = this.logger;
                    cvsController.notify(gmoNotificationModel);
                    break;
                default:
                    // 他の決済は本案件では非対応
                    this.res.send(GMONotificationResponseModel_1.default.RecvRes_OK);
                    break;
            }
        });
    }
    /**
     * 決済キャンセル
     */
    cancel() {
        let paymentNo = this.req.params.paymentNo;
        if (!Util_1.default.isValidPaymentNo(paymentNo))
            return this.next(new Error(this.req.__('Message.Invalid')));
        this.setProcessLogger(paymentNo, () => {
            this.logger.info('start process GMOReserveController.cancel.');
            this.logger.info('finding reservations...');
            Models_1.default.Reservation.find({
                payment_no: paymentNo,
                status: { $in: [ReservationUtil_1.default.STATUS_TEMPORARY, ReservationUtil_1.default.STATUS_WAITING_SETTLEMENT] }
            }, 'purchaser_group member').exec((err, reservations) => {
                this.logger.info('reservations found.', err, reservations);
                if (err)
                    return this.next(new Error(this.req.__('Message.UnexpectedError')));
                if (reservations.length === 0)
                    return this.next(new Error(this.req.__('Message.NotFound')));
                // ログイン中ユーザーの決済かどうかチェック
                let purchaserGroup = reservations[0].get('purchaser_group');
                switch (purchaserGroup) {
                    case ReservationUtil_1.default.PURCHASER_GROUP_CUSTOMER:
                        break;
                    case ReservationUtil_1.default.PURCHASER_GROUP_MEMBER:
                        if (!this.req.memberUser.isAuthenticated()) {
                            return this.next(new Error(this.req.__('Message.UnexpectedError')));
                        }
                        else if (this.req.memberUser.get('_id') !== reservations[0].get('member').toString()) {
                            return this.next(new Error(this.req.__('Message.UnexpectedError')));
                        }
                        break;
                    default:
                        break;
                }
                // キャンセル
                let promises = reservations.map((reservation) => {
                    return new Promise((resolve, reject) => {
                        this.logger.info('removing reservation...', reservation.get('_id'));
                        reservation.remove((err) => {
                            this.logger.info('reservation removed.', reservation.get('_id'), err);
                            if (err)
                                return reject(err);
                            resolve();
                        });
                    });
                });
                Promise.all(promises).then(() => {
                    this.res.render('gmo/reserve/cancel');
                }, (err) => {
                    this.res.render('gmo/reserve/cancel');
                });
            });
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = GMOReserveController;
