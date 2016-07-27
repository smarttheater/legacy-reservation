"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var ReserveBaseController_1 = require('../../ReserveBaseController');
var Util_1 = require('../../../../common/Util/Util');
var GMOUtil_1 = require('../../../../common/Util/GMO/GMOUtil');
var ReservationModel_1 = require('../../../models/Reserve/ReservationModel');
var GMOResultModel_1 = require('../../../models/Reserve/GMOResultModel');
var GMONotificationModel_1 = require('../../../models/Reserve/GMONotificationModel');
var GMONotificationResponseModel_1 = require('../../../models/Reserve/GMONotificationResponseModel');
var moment = require('moment');
var crypto = require('crypto');
var conf = require('config');
var GMOReserveCreditController_1 = require('./Credit/GMOReserveCreditController');
var GMOReserveCvsController_1 = require('./Cvs/GMOReserveCvsController');
var GMOReserveController = (function (_super) {
    __extends(GMOReserveController, _super);
    function GMOReserveController() {
        _super.apply(this, arguments);
    }
    /**
     * GMO決済を開始する
     * TODO コンビニ決済は5日前の24時まで
     */
    GMOReserveController.prototype.start = function () {
        var _this = this;
        var token = this.req.params.token;
        ReservationModel_1.default.find(token, function (err, reservationModel) {
            if (err || reservationModel === null) {
                return _this.next(new Error('予約プロセスが中断されました'));
            }
            _this.logger.debug('reservationModel is ', reservationModel.toLog());
            // 予約情報セッション削除
            _this.logger.debug('removing reservationModel... ', reservationModel);
            reservationModel.remove(function () {
                if (err) {
                }
                else {
                    // ここで予約番号発行
                    reservationModel.paymentNo = Util_1.default.createPaymentNo();
                    // 予約プロセス固有のログファイルをセット
                    _this.setProcessLogger(reservationModel.paymentNo, function () {
                        _this.logger.info('paymentNo published. paymentNo:', reservationModel.paymentNo);
                        // GMOからの結果受信にそなえてセッションを新規に作成する
                        // コンビニ支払い期限は3日なので、reservationModelは4日有効にする
                        reservationModel.token = Util_1.default.createToken();
                        _this.logger.info('saving reservationModel...new token:', reservationModel.token);
                        reservationModel.save(function (err) {
                            // GMOへ遷移画面
                            var shopId = conf.get('gmo_payment_shop_id');
                            // TODO 決済管理番号をなにかしら発行する？あるいは予約番号？
                            var orderID = reservationModel.token; // 27桁まで
                            var amount = reservationModel.getTotalPrice();
                            var shopPassword = conf.get('gmo_payment_shop_password');
                            var dateTime = moment().format('YYYYMMDDHHmmss');
                            // 「ショップ ID + オーダーID + 利用金額＋税送料＋ショップパスワード + 日時情報」を MD5 でハッシュした文字列。
                            var md5hash = crypto.createHash('md5');
                            md5hash.update("" + shopId + orderID + amount + shopPassword + dateTime, 'utf8');
                            var shopPassString = md5hash.digest('hex');
                            _this.logger.info('redirecting to GMO payment...orderID:', orderID);
                            _this.res.render('gmo/reserve/start', {
                                layout: false,
                                reservationModel: reservationModel,
                                shopId: shopId,
                                orderID: orderID,
                                amount: amount,
                                shopPassword: shopPassword,
                                dateTime: dateTime,
                                shopPassString: shopPassString
                            });
                        }, 345600);
                    });
                }
            });
        });
    };
    /**
     * GMOからの結果受信
     * TODO 決済結果チェック文字列を確認する
     */
    GMOReserveController.prototype.result = function () {
        var _this = this;
        var gmoResultModel = GMOResultModel_1.default.parse(this.req.body);
        var token = gmoResultModel.OrderID;
        ReservationModel_1.default.find(token, function (err, reservationModel) {
            if (err || reservationModel === null) {
                return _this.next(new Error('予約プロセスが中断されました'));
            }
            // 予約プロセス固有のログファイルをセット
            _this.setProcessLogger(reservationModel.paymentNo, function () {
                _this.logger.info('reservationModel is ', reservationModel.toLog());
                _this.logger.info('gmoResultModel is ', gmoResultModel);
                if (_this.req.method === 'POST') {
                    // TODO エラー結果の場合
                    if (gmoResultModel.ErrCode) {
                        _this.next(new Error("\u30A8\u30E9\u30FC\u7D50\u679C\u3092\u53D7\u4FE1\u3057\u307E\u3057\u305F\u3002 ErrCode:" + gmoResultModel.ErrCode + " ErrInfo:" + gmoResultModel.ErrInfo));
                    }
                    else {
                        // 決済方法によって振り分け
                        var nextController = void 0;
                        switch (gmoResultModel.PayType) {
                            case GMOUtil_1.default.PAY_TYPE_CREDIT:
                                _this.logger.info('starting GMOReserveCreditController.result...');
                                var creditController = new GMOReserveCreditController_1.default(_this.req, _this.res, _this.next);
                                creditController.logger = _this.logger;
                                creditController.result(reservationModel, gmoResultModel);
                                break;
                            case GMOUtil_1.default.PAY_TYPE_CVS:
                                _this.logger.info('starting GMOReserveCsvController.result...');
                                var cvsController = new GMOReserveCvsController_1.default(_this.req, _this.res, _this.next);
                                cvsController.logger = _this.logger;
                                cvsController.result(reservationModel, gmoResultModel);
                                break;
                            default:
                                _this.next(new Error('対応していない決済方法です'));
                                break;
                        }
                    }
                }
            });
        });
    };
    /**
     * GMO結果通知受信
     * TODO 何かしら決済情報チェック処理を入れる(金額とか)
     */
    GMOReserveController.prototype.notify = function () {
        // お客様は、受信したHTTPリクエストに対するHTTPレスポンスが必要となります。
        // 返却値については、以下のいずれか
        // 0：受信OK ／ 1：受信失敗
        // 【詳細：返却パラメータ(加盟店様⇒本サービス)】
        var _this = this;
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
        var gmoNotificationModel = GMONotificationModel_1.default.parse(this.req.body);
        var token = gmoNotificationModel.OrderID;
        ReservationModel_1.default.find(token, function (err, reservationModel) {
            if (err || reservationModel === null) {
                // TODO ログ
                return _this.res.send(GMONotificationResponseModel_1.default.RecvRes_NG);
            }
            // 予約プロセス固有のログファイルをセット
            _this.setProcessLogger(reservationModel.paymentNo, function () {
                _this.logger.info('reservationModel is ', reservationModel.toLog());
                _this.logger.info('gmoNotificationModel is ', gmoNotificationModel);
                switch (gmoNotificationModel.PayType) {
                    case GMOUtil_1.default.PAY_TYPE_CREDIT:
                        _this.logger.info('starting GMOReserveCreditController.notify...');
                        var creditController = new GMOReserveCreditController_1.default(_this.req, _this.res, _this.next);
                        creditController.notify(reservationModel, gmoNotificationModel);
                        creditController.logger = _this.logger;
                        break;
                    case GMOUtil_1.default.PAY_TYPE_CVS:
                        _this.logger.info('starting GMOReserveCsvController.notify...');
                        var cvsController = new GMOReserveCvsController_1.default(_this.req, _this.res, _this.next);
                        cvsController.notify(reservationModel, gmoNotificationModel);
                        cvsController.logger = _this.logger;
                        break;
                    default:
                        // 他の決済は本案件では非対応
                        _this.res.send(GMONotificationResponseModel_1.default.RecvRes_OK);
                        break;
                }
            });
        });
    };
    return GMOReserveController;
}(ReserveBaseController_1.default));
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = GMOReserveController;
