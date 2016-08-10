"use strict";
const ReserveBaseController_1 = require('../../ReserveBaseController');
const GMOUtil_1 = require('../../../../common/Util/GMO/GMOUtil');
const Models_1 = require('../../../../common/models/Models');
const ReservationUtil_1 = require('../../../../common/models/Reservation/ReservationUtil');
const ReservationModel_1 = require('../../../models/Reserve/ReservationModel');
const GMOResultModel_1 = require('../../../models/Reserve/GMOResultModel');
const GMONotificationModel_1 = require('../../../models/Reserve/GMONotificationModel');
const GMONotificationResponseModel_1 = require('../../../models/Reserve/GMONotificationResponseModel');
const moment = require('moment');
const crypto = require('crypto');
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
            this.logger.debug('reservationModel is ', reservationModel.toLog());
            // 予約情報セッション削除
            this.logger.debug('removing reservationModel... ', reservationModel);
            reservationModel.remove(() => {
                if (err) {
                }
                else {
                    // 予約プロセス固有のログファイルをセット
                    this.setProcessLogger(reservationModel.paymentNo, () => {
                        // GMOへ遷移画面
                        this.res.locals.shopId = conf.get('gmo_payment_shop_id');
                        this.res.locals.orderID = reservationModel.paymentNo; // 27桁まで(予約番号を使用)
                        this.res.locals.amount = reservationModel.getTotalCharge();
                        this.res.locals.shopPassword = conf.get('gmo_payment_shop_password');
                        this.res.locals.dateTime = moment().format('YYYYMMDDHHmmss');
                        this.res.locals.useCredit = (reservationModel.paymentMethod === GMOUtil_1.default.PAY_TYPE_CREDIT) ? '1' : '0';
                        this.res.locals.useCvs = (reservationModel.paymentMethod === GMOUtil_1.default.PAY_TYPE_CVS) ? '1' : '0';
                        // TODO コンビニ決済は5日前の24時までなので、日付確定
                        if (parseInt(moment().format('YYYYMMDD')) < 20161018) {
                        }
                        // 「ショップ ID + オーダーID + 利用金額＋税送料＋ショップパスワード + 日時情報」を MD5 でハッシュした文字列。
                        let md5hash = crypto.createHash('md5');
                        md5hash.update(`${this.res.locals.shopId}${this.res.locals.orderID}${this.res.locals.amount}${this.res.locals.shopPassword}${this.res.locals.dateTime}`, 'utf8');
                        this.res.locals.shopPassString = md5hash.digest('hex');
                        this.logger.info('redirecting to GMO payment...orderID:', this.res.locals.orderID);
                        this.res.render('gmo/reserve/start', {
                            layout: false
                        });
                    });
                }
            });
        });
    }
    /**
     * GMOからの結果受信
     */
    result() {
        let gmoResultModel = GMOResultModel_1.default.parse(this.req.body);
        let paymentNo = gmoResultModel.OrderID;
        // 予約プロセス固有のログファイルをセット
        this.setProcessLogger(paymentNo, () => {
            this.logger.info('gmoResultModel is ', gmoResultModel);
            // エラー結果の場合
            if (gmoResultModel.ErrCode) {
                // 空席に戻すのは、仮予約タイムアウトタスクにまかせる！
                this.next(new Error(`エラー結果を受信しました。 ErrCode:${gmoResultModel.ErrCode} ErrInfo:${gmoResultModel.ErrInfo}`));
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
     */
    notify() {
        // お客様は、受信したHTTPリクエストに対するHTTPレスポンスが必要となります。
        // 返却値については、以下のいずれか
        // 0：受信OK ／ 1：受信失敗
        // 【詳細：返却パラメータ(加盟店様⇒本サービス)】
        // タイムアウトについて
        // 結果通知プログラム機能によって、指定URLへデータ送信を行った場合に15秒以内に返信が無いとタイムアウトとして処
        // 理を行います。
        // 加盟店様側からの正常応答が確認出来なかった場合は約60分毎に5回再送いたします。
        // 以下のいずれかの状態でエラー通知を送信します。
        // 再送で正常終了している場合
        // ■ 通知完了(要求日時と約60分以上の差がある)
        // 再送待ちの場合
        // ■ エラー()
        // 再送も全て通知失敗した場合
        // ■リトライ回数超過
        // Error reportとは
        // 一定時間間隔内で、異常応答または無応答、通知失敗時のいずれかとなった場合にエラーを加盟店様に通知し結果通知プ
        // ログラムの受信状態を確認して頂くためのメールとなります。
        let gmoNotificationModel = GMONotificationModel_1.default.parse(this.req.body);
        let paymenyNo = gmoNotificationModel.OrderID;
        // 予約プロセス固有のログファイルをセット
        this.setProcessLogger(paymenyNo, () => {
            this.logger.info('gmoNotificationModel is ', gmoNotificationModel);
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
        let promises = [];
        this.setProcessLogger(paymentNo, () => {
            this.logger.info('start process GMOReserveController.cancel.');
            this.logger.info('finding reservations...');
            Models_1.default.Reservation.find({
                payment_no: paymentNo,
                status: ReservationUtil_1.default.STATUS_TEMPORARY
            }).exec((err, reservationDocuments) => {
                this.logger.info('reservations found.', err, reservationDocuments);
                if (err)
                    return this.next(new Error(this.req.__('Message.UnexpectedError')));
                if (reservationDocuments.length === 0)
                    return this.next(new Error(this.req.__('Message.NotFound')));
                // ログイン中ユーザーの決済かどうかチェック
                let purchaserGroup = reservationDocuments[0].get('purchaser_group');
                switch (purchaserGroup) {
                    case ReservationUtil_1.default.PURCHASER_GROUP_CUSTOMER:
                        if (!this.mvtkUser.isAuthenticated()) {
                            return this.next(new Error(this.req.__('Message.UnexpectedError')));
                        }
                        else if (this.mvtkUser.memberInfoResult.kiinCd !== reservationDocuments[0].get('mvtk_kiin_cd')) {
                            return this.next(new Error(this.req.__('Message.UnexpectedError')));
                        }
                        break;
                    case ReservationUtil_1.default.PURCHASER_GROUP_MEMBER:
                        if (!this.memberUser.isAuthenticated()) {
                            return this.next(new Error(this.req.__('Message.UnexpectedError')));
                        }
                        else if (this.memberUser.get('_id') !== reservationDocuments[0].get('member').toString()) {
                            return this.next(new Error(this.req.__('Message.UnexpectedError')));
                        }
                        break;
                    default:
                        break;
                }
                // キャンセル
                for (let reservationDocument of reservationDocuments) {
                    promises.push(new Promise((resolve, reject) => {
                        this.logger.info('removing reservation...');
                        Models_1.default.Reservation.remove({
                            _id: reservationDocument.get('_id'),
                            status: ReservationUtil_1.default.STATUS_TEMPORARY
                        }, (err) => {
                            this.logger.info('reservation removed.', err);
                            if (err) {
                                reject(new Error(this.req.__('Message.UnexpectedError')));
                            }
                            else {
                                resolve();
                            }
                        });
                    }));
                }
                Promise.all(promises).then(() => {
                    this.logger.error('canceling reservations success.');
                    this.res.redirect(this.router.build('Home'));
                }, (err) => {
                    this.logger.error('canceling reservations fail.', err);
                    this.res.redirect(this.router.build('Home'));
                });
            });
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = GMOReserveController;
