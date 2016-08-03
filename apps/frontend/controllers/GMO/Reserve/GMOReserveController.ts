import ReserveBaseController from '../../ReserveBaseController';
import Util from '../../../../common/Util/Util';
import GMOUtil from '../../../../common/Util/GMO/GMOUtil';

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

import GMOReserveCreditController from './Credit/GMOReserveCreditController';
import GMOReserveCvsController from './Cvs/GMOReserveCvsController';

export default class GMOReserveController extends ReserveBaseController {
    /**
     * GMO決済を開始する
     * TODO 仮実運用で確定
     */
    public start(): void {
        let token = this.req.params.token;
        ReservationModel.find(token, (err, reservationModel) => {
            if (err || reservationModel === null) {
                return this.next(new Error('予約プロセスが中断されました'));
            }

            this.logger.debug('reservationModel is ', reservationModel.toLog());

            // 予約情報セッション削除
            this.logger.debug('removing reservationModel... ', reservationModel);
            reservationModel.remove(() => {
                if (err) {

                } else {

                    // 予約プロセス固有のログファイルをセット
                    this.setProcessLogger(reservationModel.paymentNo, () => {

                            // GMOへ遷移画面
                            let shopId = conf.get<string>('gmo_payment_shop_id');
                            let orderID = reservationModel.paymentNo; // 27桁まで(予約番号を使用)
                            let amount = reservationModel.getTotalCharge();
                            let shopPassword = conf.get<string>('gmo_payment_shop_password');
                            let dateTime = moment().format('YYYYMMDDHHmmss');

                            // 「ショップ ID + オーダーID + 利用金額＋税送料＋ショップパスワード + 日時情報」を MD5 でハッシュした文字列。
                            let md5hash = crypto.createHash('md5');
                            md5hash.update(`${shopId}${orderID}${amount}${shopPassword}${dateTime}`, 'utf8');
                            let shopPassString = md5hash.digest('hex');

                            this.logger.info('redirecting to GMO payment...orderID:', orderID);
                            this.res.render('gmo/reserve/start', {
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

                }
            });

        });

    }

    /**
     * GMOからの結果受信
     * TODO 決済結果チェック文字列を確認する
     */
    public result(): void {
        let gmoResultModel = GMOResultModel.parse(this.req.body);
        let paymentNo = gmoResultModel.OrderID;

        // 予約プロセス固有のログファイルをセット
        this.setProcessLogger(paymentNo, () => {
            Models.Reservation.find({payment_no: paymentNo}).exec((err, reservationDocuments) => {
                if (err) {
                    // TODO
                }

                this.logger.debug('reservationDocuments are ', reservationDocuments);
                this.logger.info('gmoResultModel is ', gmoResultModel);


                // TODO エラー結果の場合
                if (gmoResultModel.ErrCode) {
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
                            this.next(new Error('invalid pay method.'));

                            break;
                    }

                }

            });

        });

    }


    /**
     * GMO結果通知受信
     * TODO 何かしら決済情報チェック処理を入れる(金額とか)
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
                        creditController.notify(gmoNotificationModel);
                        creditController.logger = this.logger;

                        break;

                    case GMOUtil.PAY_TYPE_CVS:
                        this.logger.info('starting GMOReserveCsvController.notify...');
                        let cvsController = new GMOReserveCvsController(this.req, this.res, this.next);
                        cvsController.notify(gmoNotificationModel);
                        cvsController.logger = this.logger;

                        break;

                    default:
                        // 他の決済は本案件では非対応
                        this.res.send(GMONotificationResponseModel.RecvRes_OK);

                        break;
                }

            });

    }
}
