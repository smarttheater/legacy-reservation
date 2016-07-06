import ReserveBaseController from '../../ReserveBaseController';
import Util from '../../../../common/Util/Util';

import Models from '../../../../common/models/Models';
import ReservationUtil from '../../../../common/models/Reservation/ReservationUtil';

import ReservationModel from '../../../models/Reserve/ReservationModel';
import ReservationResultModel from '../../../models/Reserve/ReservationResultModel';
import GMOResultModel from '../../../models/Reserve/GMOResultModel';
import GMONotificationModel from '../../../models/Reserve/GMONotificationModel';
import GMONotificationResponseModel from '../../../models/Reserve/GMONotificationResponseModel';

import moment = require('moment');
import crypto = require('crypto');
import conf = require('config');

export default class GMOReserveController extends ReserveBaseController {
    public start(): void {
        let token = this.req.params.token;
        ReservationModel.find(token, (err, reservationModel) => {
            if (err || reservationModel === null) {
                return this.next(new Error('予約プロセスが中断されました'));
            }

            this.logger.debug('reservationModel is ', reservationModel);

            // 予約情報セッション削除
            this.logger.debug('removing reservationModel... ', reservationModel);
            reservationModel.remove(() => {
                if (err) {

                } else {

                    switch (reservationModel.paymentMethod) {
                        case ReservationUtil.PAY_METHOD_CREDIT:

                            // GMOからの結果受信にそなえてセッションを新規に作成する
                            reservationModel.token = Util.createToken();
                            reservationModel.save((err) => {
                                // GMOへ遷移画面
                                let shopId = conf.get<string>('gmo_payment_shop_id');
                                let orderID = reservationModel.token; // 27桁まで
                                let amount = reservationModel.getTotalPrice();
                                let shopPassword = conf.get<string>('gmo_payment_shop_Password');
                                let dateTime = moment().format('YYYYMMDDHHmmss');

                                // 「ショップ ID + オーダーID + 利用金額＋税送料＋ショップパスワード + 日時情報」を MD5 でハッシュした文字列。
                                let md5hash = crypto.createHash('md5');
                                md5hash.update(`${shopId}${orderID}${amount}${shopPassword}${dateTime}`, 'utf8');
                                let shopPassString = md5hash.digest('hex');


                                this.res.render('gmo/reserve/startCredit', {
                                    layout: false,
                                    reservationModel: reservationModel,
                                    shopId,
                                    orderID,
                                    amount,
                                    shopPassword,
                                    dateTime,
                                    shopPassString
                                });

                            });

                            break;


                        case ReservationUtil.PAY_METHOD_CVS:
                            // GMOからの結果受信にそなえてセッションを新規に作成する
                            reservationModel.token = Util.createToken();
                            reservationModel.save((err) => {
                                // GMOへ遷移画面
                                let shopId = conf.get<string>('gmo_payment_shop_id');
                                let orderID = reservationModel.token; // 27桁まで
                                let amount = reservationModel.getTotalPrice();
                                let shopPassword = conf.get<string>('gmo_payment_shop_Password');
                                let dateTime = moment().format('YYYYMMDDHHmmss');

                                // 「ショップ ID + オーダーID + 利用金額＋税送料＋ショップパスワード + 日時情報」を MD5 でハッシュした文字列。
                                let md5hash = crypto.createHash('md5');
                                md5hash.update(`${shopId}${orderID}${amount}${shopPassword}${dateTime}`, 'utf8');
                                let shopPassString = md5hash.digest('hex');


                                this.res.render('gmo/reserve/startCVS', {
                                    layout: false,
                                    reservationModel: reservationModel,
                                    shopId,
                                    orderID,
                                    amount,
                                    shopPassword,
                                    dateTime,
                                    shopPassString
                                });

                            });

                            break;

                        default:
                            this.next(new Error('対応していない決済方法です'))

                            break;

                    }

                }
            });

        });

    }

    /**
     * GMOからの結果受信
     */
    public result(): void {
        let gmoResultModel = GMOResultModel.parse(this.req.body);
        this.logger.debug('gmoResultModel:', gmoResultModel);

        let token = gmoResultModel.OrderID;
        ReservationModel.find(token, (err, reservationModel) => {
            if (err || reservationModel === null) {
                return this.next(new Error('予約プロセスが中断されました'));
            }

            this.logger.debug('reservationModel is ', reservationModel);

            if (this.req.method === 'POST') {
                // エラー結果の場合
                if (gmoResultModel.ErrCode) {
                    return this.res.send(`エラー結果を受信しました。 ErrCode:${gmoResultModel.ErrCode} ErrInfo:${gmoResultModel.ErrInfo}`);
                }

                // 決済方法
                switch (gmoResultModel.PayType) {
                    // クレジットカード決済
                    case GMOResultModel.PAY_TYPE_CREDIT:

                        // 予約情報セッション削除
                        // これ以降、予約情報はローカルに引き回す
                        this.logger.debug('removing reservationModel... ', reservationModel);
                        reservationModel.remove(() => {
                            if (err) {

                            } else {
                                // TODO GMOからポストされたパラメータを予約情報に追加する

                                // 予約確定
                                this.processFixAll(reservationModel, (err, reservationModel) => {
                                    if (err) {
                                        // TODO 万が一の対応どうするか
                                        this.next(err);

                                    } else {
                                        // TODO 予約できていない在庫があった場合
                                        if (reservationModel.reservationIds.length > reservationModel.reservedDocuments.length) {
                                            this.next(new Error('決済を完了できませんでした'));

                                        } else {
                                            // 予約結果セッションを保存して、完了画面へ
                                            let reservationResultModel = reservationModel.toReservationResult();

                                            this.logger.debug('saving reservationResult...', reservationResultModel);
                                            reservationResultModel.save((err) => {
                                                this.logger.debug('redirecting complete page...token:', reservationResultModel.token);
                                                if (reservationModel.member) {
                                                    this.res.redirect(this.router.build('member.reserve.complete', {token: token}));

                                                } else {
                                                    this.res.redirect(this.router.build('customer.reserve.complete', {token: token}));
                                                }

                                            });

                                        }
                                    }
                                });

                            }
                        });

                        break;

                    // コンビニ決済
                    case GMOResultModel.PAY_TYPE_CVS:

                        // 決済待ちステータスへ変更
                        let promises = [];
                        reservationModel.reservationIds.forEach((reservationId, index) => {
                            let reservation = reservationModel.getReservation(reservationId);

                            promises.push(new Promise((resolve, reject) => {

                                this.logger.debug('updating reservation status to STATUS_WAITING_SETTLEMENT..._id:', reservationId);
                                Models.Reservation.findOneAndUpdate(
                                    {
                                        _id: reservationId,
                                    },
                                    {
                                        status: ReservationUtil.STATUS_WAITING_SETTLEMENT,
                                        updated_user: this.constructor.toString(),
                                    },
                                    {
                                        new: true
                                    },
                                (err, reservationDocument) => {
                                    this.logger.info('STATUS_TEMPORARY to STATUS_WAITING_SETTLEMENT processed.', err, reservationDocument, reservationModel);

                                    if (err) {
                                        // TODO ログ出力
                                        reject();

                                    } else {
                                        resolve();
                                    }

                                });

                            }));
                        });

                        Promise.all(promises).then(() => {
                            if (reservationModel.member) {
                                this.res.redirect(this.router.build('member.reserve.waitingSettlement', {token: token}));

                            } else {
                                this.res.redirect(this.router.build('customer.reserve.waitingSettlement', {token: token}));

                            }

                        }, (err) => {
                            // TODO どうする？
                            this.next(err);

                        });

                        break;

                    default:
                        this.next(new Error('対応していない決済方法です'));

                        break;
                }
            }
        });

    }


    /**
     * GMO結果通知受信
     */
    public notify(): void {
        // お客様は、受信したHTTPリクエストに対するHTTPレスポンスが必要となります。
        // 返却値については、以下のいずれか
        // 0：受信OK ／ 1：受信失敗
        // 【詳細：返却パラメータ(加盟店様⇒本サービス)】

        // タイムアウトについて
        // 結果通知プログラム機能によって、指定URLへデータ送信を行った場合に15秒以内に返信が無いとタイムアウトとして処
        // 理を行います。


        // 加盟店様側からの正常応答が確認出来なかった場合は約60分毎に5回再送いたします。




        // コンビニ決済
        // 4 入金通知 ○
        // 5 期限切れ ○
        // 6 支払い停止 ○




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


        let gmoNotificationModel = GMONotificationModel.parse(this.req.body);
        this.logger.debug('gmoNotificationModel:', gmoNotificationModel);

        let token = gmoNotificationModel.OrderID;
        ReservationModel.find(token, (err, reservationModel) => {
            if (err || reservationModel === null) {
                // TODO ログ
                return this.res.send(GMONotificationResponseModel.RecvRes_NG);
            }

            this.logger.debug('reservationModel is ', reservationModel);

            switch (gmoNotificationModel.PayType) {


                case ReservationUtil.PAY_METHOD_CVS:
                    if (gmoNotificationModel.Status === 'PAYSUCCESS') {
                        // 決済待ちの予約を予約完了へ
                        // 予約情報セッション削除
                        // これ以降、予約情報はローカルに引き回す
                        this.logger.debug('removing reservationModel... ', reservationModel);
                        reservationModel.remove(() => {
                            if (err) {
                                // TODO ログ
                                this.res.send(GMONotificationResponseModel.RecvRes_NG);

                            } else {
                                // TODO GMOからポストされたパラメータを予約情報に追加する

                                // 予約確定
                                this.processFixAll(reservationModel, (err, reservationModel) => {
                                    if (err) {
                                        // TODO 万が一の対応どうするか
                                        this.res.send(GMONotificationResponseModel.RecvRes_NG);

                                    } else {
                                        // TODO 予約できていない在庫があった場合
                                        if (reservationModel.reservationIds.length > reservationModel.reservedDocuments.length) {
                                            this.res.send(GMONotificationResponseModel.RecvRes_NG);

                                        } else {
                                            // 完了
                                            this.res.send(GMONotificationResponseModel.RecvRes_OK);

                                        }
                                    }
                                });

                            }
                        });
                    // } else if (gmoNotificationModel.Status === 'REQSUCCESS') {
                    // } else if (gmoNotificationModel.Status === 'UNPROCESSED') {
                    // } else if (gmoNotificationModel.Status === 'PAYFAIL') {
                    // } else if (gmoNotificationModel.Status === 'EXPIRED') {
                    // } else if (gmoNotificationModel.Status === 'CANCEL') {
                    } else {
                        this.res.send(GMONotificationResponseModel.RecvRes_NG);

                    }

                    break;




                default:
                    this.res.send(GMONotificationResponseModel.RecvRes_OK);

                    break;
            }
        });

    }
}
