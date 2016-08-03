import ReserveBaseController from '../../../ReserveBaseController';
import Util from '../../../../../common/Util/Util';
import GMOUtil from '../../../../../common/Util/GMO/GMOUtil';
import Models from '../../../../../common/models/Models';
import ReservationUtil from '../../../../../common/models/Reservation/ReservationUtil';
import ReservationModel from '../../../../models/Reserve/ReservationModel';
import GMOResultModel from '../../../../models/Reserve/GMOResultModel';
import GMONotificationModel from '../../../../models/Reserve/GMONotificationModel';
import GMONotificationResponseModel from '../../../../models/Reserve/GMONotificationResponseModel';
import conf = require('config');
import request = require('request');
import querystring = require('querystring');

export default class GMOReserveCreditController extends ReserveBaseController {
    /**
     * GMOからの結果受信
     */
    public result(gmoResultModel: GMOResultModel): void {
        // TODO 支払い期限過ぎていたらキャンセル(10分？)

        // 予約完了ステータスへ変更
        let update = {
            gmo_shop_id: gmoResultModel.ShopID,
            gmo_amount: gmoResultModel.Amount,
            gmo_tax: gmoResultModel.Tax,
            gmo_access_id: gmoResultModel.AccessID,
            gmo_access_pass: gmoResultModel.AccessPass,
            gmo_forward: gmoResultModel.Forwarded,
            gmo_method: gmoResultModel.Method,
            gmo_approve: gmoResultModel.Approve,
            gmo_tran_id: gmoResultModel.TranID,
            gmo_tran_date: gmoResultModel.TranDate,
            gmo_pay_type: gmoResultModel.PayType,
            gmo_status: gmoResultModel.JobCd,
            // gmo_cvs_code: gmoResultModel.CvsCode,
            // gmo_cvs_conf_no: gmoResultModel.CvsConfNo,
            // gmo_cvs_receipt_no: gmoResultModel.CvsReceiptNo,
            // gmo_cvs_receipt_url: gmoResultModel.CvsReceiptUrl,
            status: ReservationUtil.STATUS_RESERVED,
            updated_user: 'GMOReserveCreditController'
        };

        this.logger.info('updating resertions...update:', update);
        Models.Reservation.update(
            {
                payment_no: gmoResultModel.OrderID,
                status: ReservationUtil.STATUS_TEMPORARY
            },
            update,
            {
                multi: true
            },
        (err, affectedRows, raw) => {
            this.logger.info('reservations updated.', err, affectedRows);
            if (err) {
                // TODO

            }

            // TODO メール送信はバッチ通知のほうでのみやる
            // TODO 予約できていない在庫があった場合
            this.logger.info('redirecting to complete...');

            // 購入者区分による振り分け
            Models.Reservation.findOne({payment_no: gmoResultModel.OrderID}, 'purchaser_group', (err, reservationDocument) => {
                if (err) {
                    // TODO

                }

                let group = reservationDocument.get('purchaser_group');
                switch (group) {
                    case ReservationUtil.PURCHASER_GROUP_MEMBER:
                        this.res.redirect(this.router.build('member.reserve.complete', {paymentNo: gmoResultModel.OrderID}));
                        break;

                    default:
                        this.res.redirect(this.router.build('customer.reserve.complete', {paymentNo: gmoResultModel.OrderID}));
                        break;

                }
            });

        });

    }


    /**
     * GMO結果通知受信
     */
    public notify(gmoNotificationModel: GMONotificationModel): void {
        let paymentNo = gmoNotificationModel.OrderID;
        let promises = [];
        let update;

        switch (gmoNotificationModel.Status) {
            case GMOUtil.STATUS_CREDIT_CAPTURE:
            case GMOUtil.STATUS_CREDIT_UNPROCESSED:
            case GMOUtil.STATUS_CREDIT_AUTHENTICATED:
            case GMOUtil.STATUS_CREDIT_CHECK:
                this.res.send(GMONotificationResponseModel.RecvRes_NG);

                break;

            case GMOUtil.STATUS_CREDIT_AUTH:
                // TODO 支払い期限過ぎていたらキャンセル(10分？)


                // 予約完了ステータスへ変更
                update = {
                    gmo_shop_id: gmoNotificationModel.ShopID,
                    gmo_amount: gmoNotificationModel.Amount,
                    gmo_tax: gmoNotificationModel.Tax,
                    gmo_access_id: gmoNotificationModel.AccessID,
                    gmo_access_pass: gmoNotificationModel.AccessPass,
                    gmo_forward: gmoNotificationModel.Forward,
                    gmo_method: gmoNotificationModel.Method,
                    gmo_approve: gmoNotificationModel.Approve,
                    gmo_tran_id: gmoNotificationModel.TranID,
                    gmo_tran_date: gmoNotificationModel.TranDate,
                    gmo_pay_type: gmoNotificationModel.PayType,
                    gmo_status: gmoNotificationModel.Status,
                    status: ReservationUtil.STATUS_RESERVED,
                    updated_user: 'GMOReserveCreditController'
                };

                Models.Reservation.find(
                    {
                        payment_no: paymentNo,
                        status: ReservationUtil.STATUS_TEMPORARY
                    },
                    '_id',
                    (err, reservationDocuments) => {
                        for (let reservationDocument of reservationDocuments) {
                            promises.push(new Promise((resolve, reject) => {

                                this.logger.info('updating reservations...update:', update);
                                Models.Reservation.findOneAndUpdate(
                                    {
                                        _id: reservationDocument.get('_id'),
                                    },
                                    update,
                                    {
                                        new: true
                                    },
                                (err, reservationDocument) => {
                                    this.logger.info('reservation updated.', err, reservationDocument);

                                    if (err) {
                                        reject();

                                    } else {
                                        resolve();

                                    }

                                });

                            }));
                        };

                        Promise.all(promises).then(() => {
                            // TODO メール送信はバッチ処理？
                            // TODO メールの送信ログ（宛先、件名、本文）を保管して下さい。出来ればBlob（受信拒否等で取れなかった場合の再送用）

                            // 実売上要求
                            this.alterTran2sales(gmoNotificationModel, (err: Error) => {
                                if (err) {

                                }

                                // 実売上に失敗しても、とりあえずOK
                                this.logger.info('sending response RecvRes_OK...gmoNotificationModel.Status:', gmoNotificationModel.Status);
                                this.res.send(GMONotificationResponseModel.RecvRes_OK);

                            });

                        }, (err) => {
                            // 売上取消
                            this.alterTran2void(gmoNotificationModel, (err: Error) => {
                                if (err) {

                                }

                                this.logger.info('sending response RecvRes_NG...');
                                this.res.send(GMONotificationResponseModel.RecvRes_NG);

                            });

                        });
                    }
                );

                break;

            case GMOUtil.STATUS_CREDIT_SALES:
                update = {
                    gmo_status: gmoNotificationModel.Status,
                    updated_user: 'GMOReserveCreditController'
                };

                // GMOステータス変更
                this.logger.info('updating reservations...update:', update);
                Models.Reservation.update(
                    {
                        payment_no: paymentNo,
                        status: ReservationUtil.STATUS_RESERVED
                    },
                    update,
                    {
                        multi: true
                    },
                (err, affectedRows, raw) => {
                    this.logger.info('reservations updated.', err, affectedRows);
                    if (err) {
                        // TODO
                        this.logger.info('sending response RecvRes_NG...gmoNotificationModel.Status:', gmoNotificationModel.Status);
                        this.res.send(GMONotificationResponseModel.RecvRes_NG);

                    } else {
                        // TODO 予約できていない在庫があった場合


                        this.logger.info('sending response RecvRes_OK...');
                        this.res.send(GMONotificationResponseModel.RecvRes_OK);

                    }

                });

                break;

            case GMOUtil.STATUS_CREDIT_VOID:
                this.res.send(GMONotificationResponseModel.RecvRes_NG);

                break;

            case GMOUtil.STATUS_CREDIT_RETURN:
                this.res.send(GMONotificationResponseModel.RecvRes_NG);

                break;

            case GMOUtil.STATUS_CREDIT_RETURNX:
                this.res.send(GMONotificationResponseModel.RecvRes_NG);

                break;

            case GMOUtil.STATUS_CREDIT_SAUTH:
                this.res.send(GMONotificationResponseModel.RecvRes_NG);

                break;

            default:
                this.res.send(GMONotificationResponseModel.RecvRes_OK);

                break;
        }

    }

    private alterTran2sales(gmoNotificationModel: GMONotificationModel, cb: (err: Error) => void): void {

        let options = {
            url: 'https://pt01.mul-pay.jp/payment/AlterTran.idPass',
            form: {
                ShopID: conf.get<string>('gmo_payment_shop_id'),
                ShopPass: conf.get<string>('gmo_payment_shop_password'),
                AccessID: gmoNotificationModel.AccessID,
                AccessPass: gmoNotificationModel.AccessPass,
                JobCd: GMOUtil.STATUS_CREDIT_SALES,
                Amount: gmoNotificationModel.Amount
            }
        };

        this.logger.info('requesting... options:', options);
        request.post(options, (error, response, body) => {
            this.logger.info('request processed.', error, response, body);

            if (error) {
                return cb(error);
            }

            if (response.statusCode !== 200) {
                return cb(new Error(body));
            }

            let result = querystring.parse(body);
            // AccessID
            // AccessPass
            // Forward
            // Approve
            // TranID
            // TranDate
            // ErrCode
            // ErrInfo

            if (result.hasOwnProperty('ErrCode')) {
                // TODO
                cb(new Error(body));
            } else {
                cb(null);
            }

        });
    }

    private alterTran2void(gmoNotificationModel: GMONotificationModel, cb: (err: Error) => void): void {

        let options = {
            url: 'https://pt01.mul-pay.jp/payment/AlterTran.idPass',
            form: {
                ShopID: conf.get<string>('gmo_payment_shop_id'),
                ShopPass: conf.get<string>('gmo_payment_shop_password'),
                AccessID: gmoNotificationModel.AccessID,
                AccessPass: gmoNotificationModel.AccessPass,
                JobCd: GMOUtil.STATUS_CREDIT_VOID,
                Amount: gmoNotificationModel.Amount
            }
        };

        this.logger.info('requesting... options:', options);
        request.post(options, (error, response, body) => {
            this.logger.info('request processed.', error, response, body);

            if (error) {
                return cb(error);
            }

            if (response.statusCode !== 200) {
                return cb(new Error(body));
            }

            let result = querystring.parse(body);
            // AccessID
            // AccessPass
            // Forward
            // Approve
            // TranID
            // TranDate
            // ErrCode
            // ErrInfo

            if (result.hasOwnProperty('ErrCode')) {
                // TODO
                cb(new Error(body));
            } else {
                cb(null);
            }

        });
    }
}