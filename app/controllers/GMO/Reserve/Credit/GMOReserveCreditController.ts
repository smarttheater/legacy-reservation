import {Models} from '@motionpicture/ttts-domain';
import {ReservationUtil} from '@motionpicture/ttts-domain';
import * as conf from 'config';
import * as crypto from 'crypto';
import GMOResultModel from '../../../../models/Reserve/GMOResultModel';
import ReserveBaseController from '../../../ReserveBaseController';

export default class GMOReserveCreditController extends ReserveBaseController {
    /**
     * GMOからの結果受信
     */
    public result(gmoResultModel: GMOResultModel): void {
        // 予約完了ステータスへ変更
        const update = {
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
                const md5hash = crypto.createHash('md5');
                md5hash.update(`${gmoResultModel.OrderID}${gmoResultModel.Forwarded}${gmoResultModel.Method}${gmoResultModel.PayTimes}${gmoResultModel.Approve}${gmoResultModel.TranID}${gmoResultModel.TranDate}${conf.get<string>('gmo_payment_shop_password')}`, 'utf8');
                const checkString = md5hash.digest('hex');

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
                    const group = reservations[0].get('purchaser_group');
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
