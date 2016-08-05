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
import crypto = require('crypto');
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
                        this.res.locals.shopId = conf.get<string>('gmo_payment_shop_id');
                        this.res.locals.orderID = reservationModel.paymentNo; // 27桁まで(予約番号を使用)
                        this.res.locals.amount = reservationModel.getTotalCharge();
                        this.res.locals.shopPassword = conf.get<string>('gmo_payment_shop_password');
                        this.res.locals.dateTime = moment().format('YYYYMMDDHHmmss');
                        this.res.locals.useCredit = (reservationModel.paymentMethod === GMOUtil.PAY_TYPE_CREDIT) ? '1' : '0';
                        this.res.locals.useCvs = (reservationModel.paymentMethod === GMOUtil.PAY_TYPE_CVS) ? '1' : '0';

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
    public result(): void {
        let gmoResultModel = GMOResultModel.parse(this.req.body);
        let paymentNo = gmoResultModel.OrderID;

        // 予約プロセス固有のログファイルをセット
        this.setProcessLogger(paymentNo, () => {
            this.logger.info('gmoResultModel is ', gmoResultModel);

            Models.Reservation.find({payment_no: paymentNo}).exec((err, reservationDocuments) => {
                if (err) {
                    // TODO
                }

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
                            this.next(new Error('invalid pay method.'));

                            break;
                    }

                }

            });

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

    /**
     * 決済キャンセル
     */
    public cancel(): void {
        let paymentNo = this.req.params.paymentNo;
        let promises = [];

        this.setProcessLogger(paymentNo, () => {
            Models.Reservation.find(
                {
                    payment_no: paymentNo,
                    status: ReservationUtil.STATUS_TEMPORARY
                }
            ).exec((err, reservationDocuments) => {
                if (err || reservationDocuments.length < 1) {
                    // TODO
                    return this.next(new Error('invalid access.'));
                }

                // ログイン中ユーザーの決済かどうかチェック
                let purchaserGroup = reservationDocuments[0].get('purchaser_group');
                switch (purchaserGroup) {
                    case ReservationUtil.PURCHASER_GROUP_CUSTOMER:
                        if (!this.mvtkUser.isAuthenticated()) {
                            return this.next(new Error('invalid access.'));

                        } else if (this.mvtkUser.memberInfoResult.kiinCd !== reservationDocuments[0].get('mvtk_kiin_cd')) {
                            return this.next(new Error('invalid access.'));

                        }

                        break;

                    case ReservationUtil.PURCHASER_GROUP_MEMBER:
                        if (!this.memberUser.isAuthenticated()) {
                            return this.next(new Error('invalid access.'));

                        } else if (this.memberUser.get('_id') !== reservationDocuments[0].get('member').toString()) {
                            return this.next(new Error('invalid access.'));

                        }

                        break;

                    default:
                        break;
                }

                // キャンセル
                for (let reservationDocument of reservationDocuments) {
                    promises.push(new Promise((resolve, reject) => {
                        Models.Reservation.update(
                            {
                                _id: reservationDocument.get('_id').toString()
                            },
                            {
                                status: ReservationUtil.STATUS_AVAILABLE
                            },
                            (err, raw) => {
                                if (err) {
                                    // TODO ログ
                                    reject();
                                } else {
                                    resolve();
                                }

                            }
                        );

                    }));

                }

                Promise.all(promises).then(() => {
                    this.res.redirect(this.router.build('Home'));

                }, (err) => {
                    this.res.redirect(this.router.build('Home'));

                });

            });

        });

    }
}
