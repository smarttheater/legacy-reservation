import ReserveBaseController from '../../ReserveBaseController';
import Util from '../../../../common/Util/Util';
import GMOUtil from '../../../../common/Util/GMO/GMOUtil';

import Models from '../../../../common/models/Models';
import ReservationUtil from '../../../../common/models/Reservation/ReservationUtil';
import ReservationModel from '../../../models/Reserve/ReservationModel';
import GMOResultModel from '../../../models/Reserve/GMOResultModel';
import GMONotificationModel from '../../../models/Reserve/GMONotificationModel';
import GMONotificationResponseModel from '../../../models/Reserve/GMONotificationResponseModel';
import moment = require('moment');
import conf = require('config');
import GMOReserveCreditController from './Credit/GMOReserveCreditController';
import GMOReserveCvsController from './Cvs/GMOReserveCvsController';

export default class GMOReserveController extends ReserveBaseController {
    /**
     * GMO決済を開始する
     */
    public start(): void {
        let token = this.req.params.token;
        ReservationModel.find(token, (err, reservationModel) => {
            if (err) return this.next(new Error(this.req.__('Message.Expired')));

            // 予約情報セッション削除
            reservationModel.remove(() => {
                // 予約プロセス固有のログファイルをセット
                this.setProcessLogger(reservationModel.paymentNo, () => {
                    // GMOへ遷移画面
                    this.res.locals.shopId = conf.get<string>('gmo_payment_shop_id');
                    this.res.locals.orderID = reservationModel.paymentNo; // 27桁まで(予約番号を使用)
                    this.res.locals.amount = reservationModel.getTotalCharge().toString();
                    this.res.locals.dateTime =  moment(reservationModel.purchasedAt).format('YYYYMMDDHHmmss');
                    this.res.locals.useCredit = (reservationModel.paymentMethod === GMOUtil.PAY_TYPE_CREDIT) ? '1' : '0';
                    this.res.locals.useCvs = (reservationModel.paymentMethod === GMOUtil.PAY_TYPE_CVS) ? '1' : '0';
                    this.res.locals.shopPassString = GMOUtil.createShopPassString(
                        conf.get<string>('gmo_payment_shop_id'),
                        this.res.locals.orderID,
                        this.res.locals.amount,
                        conf.get<string>('gmo_payment_shop_password'),
                        this.res.locals.dateTime
                    );

                    this.logger.info('redirecting to GMO payment...');
                    this.res.render('gmo/reserve/start');
                });
            });
        });
    }

    /**
     * GMOからの結果受信
     */
    public result(): void {
        let gmoResultModel = GMOResultModel.parse(this.req.body);
        let paymentNo = gmoResultModel.OrderID;

        // 予約プロセス固有のログファイルをセット
        this.setProcessLogger(paymentNo, () => {
            this.logger.info('gmoResultModel is ', gmoResultModel);

            // エラー結果の場合
            if (gmoResultModel.ErrCode) {
                // 空席に戻すのは、仮予約タイムアウトタスクにまかせる！
                this.next(new Error(`エラー結果を受信しました。 ErrCode:${gmoResultModel.ErrCode} ErrInfo:${gmoResultModel.ErrInfo}`));

            } else {
                // 決済方法によって振り分け
                switch (gmoResultModel.PayType) {

                    case GMOUtil.PAY_TYPE_CREDIT:
                        this.logger.info('starting GMOReserveCreditController.result...');
                        let creditController = new GMOReserveCreditController(this.req, this.res, this.next);
                        creditController.logger = this.logger;
                        creditController.result(gmoResultModel);

                        break;

                    case GMOUtil.PAY_TYPE_CVS:
                        this.logger.info('starting GMOReserveCsvController.result...');
                        let cvsController = new GMOReserveCvsController(this.req, this.res, this.next);
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
    public notify(): void {
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


        let gmoNotificationModel = GMONotificationModel.parse(this.req.body);
        let paymenyNo = gmoNotificationModel.OrderID;

        // 予約プロセス固有のログファイルをセット
        this.setProcessLogger(paymenyNo, () => {
            this.logger.info('gmoNotificationModel is ', gmoNotificationModel);

            switch (gmoNotificationModel.PayType) {

                case GMOUtil.PAY_TYPE_CREDIT:
                    this.logger.info('starting GMOReserveCreditController.notify...');
                    let creditController = new GMOReserveCreditController(this.req, this.res, this.next);
                    creditController.logger = this.logger;
                    creditController.notify(gmoNotificationModel);

                    break;

                case GMOUtil.PAY_TYPE_CVS:
                    this.logger.info('starting GMOReserveCsvController.notify...');
                    let cvsController = new GMOReserveCvsController(this.req, this.res, this.next);
                    cvsController.logger = this.logger;
                    cvsController.notify(gmoNotificationModel);

                    break;

                default:
                    // 他の決済は本案件では非対応
                    this.res.send(GMONotificationResponseModel.RecvRes_OK);

                    break;
            }

        });
    }

    /**
     * 決済キャンセル
     */
    public cancel(): void {
        let paymentNo = this.req.params.paymentNo;
        if (!Util.isValidPaymentNo(paymentNo)) return this.next(new Error(this.req.__('Message.Invalid')));

        this.setProcessLogger(paymentNo, () => {
            this.logger.info('start process GMOReserveController.cancel.');

            this.logger.info('finding reservations...');
            Models.Reservation.find(
                {
                    payment_no: paymentNo,
                    status: {$in: [ReservationUtil.STATUS_TEMPORARY, ReservationUtil.STATUS_WAITING_SETTLEMENT]}
                },
                'purchaser_group member'
            ).exec((err, reservations) => {
                this.logger.info('reservations found.', err, reservations);
                if (err) return this.next(new Error(this.req.__('Message.UnexpectedError')));
                if (reservations.length === 0) return this.next(new Error(this.req.__('Message.NotFound')));

                // ログイン中ユーザーの決済かどうかチェック
                let purchaserGroup = reservations[0].get('purchaser_group');
                switch (purchaserGroup) {
                    case ReservationUtil.PURCHASER_GROUP_CUSTOMER:
                        break;

                    case ReservationUtil.PURCHASER_GROUP_MEMBER:
                        if (!this.req.memberUser.isAuthenticated()) {
                            return this.next(new Error(this.req.__('Message.UnexpectedError')));

                        } else if (this.req.memberUser.get('_id') !== reservations[0].get('member').toString()) {
                            return this.next(new Error(this.req.__('Message.UnexpectedError')));

                        }

                        break;

                    default:
                        break;
                }

                // キャンセル
                let promises = [];
                for (let reservation of reservations) {
                    promises.push(new Promise((resolve, reject) => {
                        this.logger.info('removing reservation...');
                        reservation.remove((err) => {
                            this.logger.info('reservation removed.', err);
                            if (err) {
                                reject(new Error(this.req.__('Message.UnexpectedError')));
                            } else {
                                resolve();
                            }
                        });
                    }));
                }

                Promise.all(promises).then(() => {
                    this.logger.info('reservations successfully canceled.');
                    this.res.redirect(this.router.build('Home'));
                }, (err) => {
                    this.logger.error('any reservations not canceled.', err);
                    this.res.redirect(this.router.build('Home'));
                });
            });
        });
    }
}
