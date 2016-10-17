import ReserveBaseController from '../../../ReserveBaseController';
import GMOUtil from '../../../../../common/Util/GMO/GMOUtil';
import Models from '../../../../../common/models/Models';
import ReservationUtil from '../../../../../common/models/Reservation/ReservationUtil';
import GMOResultModel from '../../../../models/Reserve/GMOResultModel';
import GMONotificationModel from '../../../../models/Reserve/GMONotificationModel';
import GMONotificationResponseModel from '../../../../models/Reserve/GMONotificationResponseModel';
import conf = require('config');
import crypto = require('crypto');
import moment = require('moment');

export default class GMOReserveCreditController extends ReserveBaseController {
    /**
     * GMOからの結果受信
     */
    public result(gmoResultModel: GMOResultModel): void {
        // 予約完了ステータスへ変更
        let update = {
            gmo_shop_id: gmoResultModel.ShopID,
            gmo_amount: gmoResultModel.Amount,
            gmo_tax: gmoResultModel.Tax,
            gmo_access_id: gmoResultModel.AccessID,
            gmo_forward: gmoResultModel.Forwarded,
            gmo_method: gmoResultModel.Method,
            gmo_approve: gmoResultModel.Approve,
            gmo_tran_id: gmoResultModel.TranID,
            gmo_tran_date: gmoResultModel.TranDate,
            gmo_pay_type: gmoResultModel.PayType,
            gmo_status: gmoResultModel.JobCd
        };

        // 内容の整合性チェック
        this.logger.info('finding reservations...payment_no:', gmoResultModel.OrderID);
        Models.Reservation.find(
            {
                payment_no: gmoResultModel.OrderID
            },
            '_id purchaser_group pre_customer',
            (err, reservations) => {
                this.logger.info('reservations found.', err, reservations.length);
                if (err) return this.next(new Error(this.req.__('Message.UnexpectedError')));
                if (reservations.length === 0) return this.next(new Error(this.req.__('Message.UnexpectedError')));

                // チェック文字列
                // 8 ＋ 9 ＋ 10 ＋ 11 ＋ 12 ＋ 13 ＋ 14 ＋ ショップパスワード
                let md5hash = crypto.createHash('md5');
                md5hash.update(`${gmoResultModel.OrderID}${gmoResultModel.Forwarded}${gmoResultModel.Method}${gmoResultModel.PayTimes}${gmoResultModel.Approve}${gmoResultModel.TranID}${gmoResultModel.TranDate}${conf.get<string>('gmo_payment_shop_password')}`, 'utf8');
                let checkString = md5hash.digest('hex');

                this.logger.info('CheckString must be ', checkString);
                if (checkString !== gmoResultModel.CheckString) {
                    return this.next(new Error(this.req.__('Message.UnexpectedError')));
                }


                this.logger.info('processFixReservations processing... update:', update);
                this.processFixReservations(gmoResultModel.OrderID, update, (err) => {
                    this.logger.info('processFixReservations processed.', err);
                    // 売上取消したいところだが、結果通知も裏で動いているので、うかつにできない
                    if (err) return this.next(new Error(this.req.__('Message.ReservationNotCompleted')));

                    this.logger.info('redirecting to complete...');
                    // 購入者区分による振り分け
                    let group = reservations[0].get('purchaser_group');
                    switch (group) {
                        case ReservationUtil.PURCHASER_GROUP_MEMBER:
                            this.res.redirect(this.router.build('member.reserve.complete', {paymentNo: gmoResultModel.OrderID}));
                            break;
                        default:
                            if (reservations[0].get('pre_customer')) {
                                this.res.redirect(this.router.build('pre.reserve.complete', {paymentNo: gmoResultModel.OrderID}));
                            } else {
                                this.res.redirect(this.router.build('customer.reserve.complete', {paymentNo: gmoResultModel.OrderID}));
                            }

                            break;
                    }
                });
            }
        );
    }

    /**
     * GMO結果通知受信
     */
    public notify(gmoNotificationModel: GMONotificationModel): void {
        let paymentNo = gmoNotificationModel.OrderID;
        let update;

        switch (gmoNotificationModel.Status) {
            case GMOUtil.STATUS_CREDIT_CAPTURE:
                // 予約完了ステータスへ変更
                update = {
                    gmo_shop_id: gmoNotificationModel.ShopID,
                    gmo_amount: gmoNotificationModel.Amount,
                    gmo_tax: gmoNotificationModel.Tax,
                    gmo_access_id: gmoNotificationModel.AccessID,
                    gmo_forward: gmoNotificationModel.Forward,
                    gmo_method: gmoNotificationModel.Method,
                    gmo_approve: gmoNotificationModel.Approve,
                    gmo_tran_id: gmoNotificationModel.TranID,
                    gmo_tran_date: gmoNotificationModel.TranDate,
                    gmo_pay_type: gmoNotificationModel.PayType,
                    gmo_status: gmoNotificationModel.Status
                };

                // 内容の整合性チェック
                this.logger.info('finding reservations...payment_no:', paymentNo);
                Models.Reservation.find(
                    {
                        payment_no: paymentNo
                    },
                    '_id purchased_at gmo_shop_pass_string',
                    (err, reservations) => {
                        this.logger.info('reservations found.', err, reservations.length);
                        if (err) return this.res.send(GMONotificationResponseModel.RecvRes_NG);
                        if (reservations.length === 0) return this.res.send(GMONotificationResponseModel.RecvRes_NG);

                        // チェック文字列
                        let shopPassString = GMOUtil.createShopPassString(
                            gmoNotificationModel.ShopID,
                            gmoNotificationModel.OrderID,
                            gmoNotificationModel.Amount,
                            conf.get<string>('gmo_payment_shop_password'),
                            moment(reservations[0].get('purchased_at')).format('YYYYMMDDHHmmss')
                        );
                        this.logger.info('shopPassString must be ', reservations[0].get('gmo_shop_pass_string'));
                        if (shopPassString !== reservations[0].get('gmo_shop_pass_string')) {
                            return this.res.send(GMONotificationResponseModel.RecvRes_NG);
                        }

                        this.logger.info('processFixReservations processing... update:', update);
                        this.processFixReservations(paymentNo, update, (err) => {
                            this.logger.info('processFixReservations processed.', err);
                            if (err) {
                                // AccessPassが************なので、売上取消要求は行えない
                                // 失敗した場合、約60分毎に5回再通知されるので、それをリトライとみなす
                                this.logger.info('sending response RecvRes_NG...gmoNotificationModel.Status:', gmoNotificationModel.Status);
                                this.res.send(GMONotificationResponseModel.RecvRes_NG);
                            } else {
                                this.logger.info('sending response RecvRes_OK...gmoNotificationModel.Status:', gmoNotificationModel.Status);
                                this.res.send(GMONotificationResponseModel.RecvRes_OK);
                            }
                        });
                    }
                );

                break;

            case GMOUtil.STATUS_CREDIT_UNPROCESSED:
                // 未決済の場合、放置
                // ユーザーが「戻る」フローでキャンセルされる、あるいは、時間経過で空席になる
                this.res.send(GMONotificationResponseModel.RecvRes_OK);
                break;

            case GMOUtil.STATUS_CREDIT_AUTHENTICATED:
            case GMOUtil.STATUS_CREDIT_CHECK:
                this.res.send(GMONotificationResponseModel.RecvRes_NG);
                break;

            case GMOUtil.STATUS_CREDIT_AUTH:
                this.res.send(GMONotificationResponseModel.RecvRes_NG);
                break;

            case GMOUtil.STATUS_CREDIT_SALES:
                this.res.send(GMONotificationResponseModel.RecvRes_NG);
                break;

            case GMOUtil.STATUS_CREDIT_VOID: // 取消し
                this.res.send(GMONotificationResponseModel.RecvRes_OK);
                break;


                // 空席に戻す(つくったけれども、連動しない方向で仕様決定)
                /*
                this.logger.info('finding reservations...payment_no:', paymentNo);
                Models.Reservation.find(
                    {
                        payment_no: paymentNo
                    },
                    '_id purchased_at gmo_shop_pass_string',
                    (err, reservations) => {
                        this.logger.info('reservations found.', err, reservations.length);
                        if (err) return this.res.send(GMONotificationResponseModel.RecvRes_NG);
                        if (reservations.length === 0) return this.res.send(GMONotificationResponseModel.RecvRes_OK); // 予約なければもう通知必要ない

                        // チェック文字列
                        let shopPassString = GMOUtil.createShopPassString(
                            gmoNotificationModel.ShopID,
                            gmoNotificationModel.OrderID,
                            gmoNotificationModel.Amount,
                            conf.get<string>('gmo_payment_shop_password'),
                            moment(reservations[0].get('purchased_at')).format('YYYYMMDDHHmmss')
                        );
                        this.logger.info('shopPassString must be ', reservations[0].get('gmo_shop_pass_string'));
                        if (shopPassString !== reservations[0].get('gmo_shop_pass_string')) {
                            return this.res.send(GMONotificationResponseModel.RecvRes_NG);
                        }

                        // キャンセル
                        this.logger.info('removing reservations...payment_no:', paymentNo);
                        let promises = reservations.map((reservation) => {
                            return new Promise((resolve, reject) => {
                                this.logger.info('removing reservation...', reservation.get('_id'));
                                reservation.remove((err) => {
                                    this.logger.info('reservation removed.', reservation.get('_id'), err);
                                    (err) ? reject(err) : resolve();
                                });
                            });
                        });
                        Promise.all(promises).then(() => {
                            this.logger.info('sending response RecvRes_OK...');
                            this.res.send(GMONotificationResponseModel.RecvRes_OK);
                        }, (err) => {
                            this.logger.info('sending response RecvRes_NG...');
                            this.res.send(GMONotificationResponseModel.RecvRes_NG);
                        });
                    }
                );

                break;
                */

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

    /**
     * GMOに対して実売上要求を行う
     */
    /*
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
                cb(new Error(body));
            } else {
                cb(null);
            }
        });
    }
    */

    /**
     * GMOに対して取消要求を行う
     */
    /*
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
                cb(new Error(body));
            } else {
                cb(null);
            }
        });
    }
    */
}
