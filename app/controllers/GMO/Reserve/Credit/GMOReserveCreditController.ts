import { Models, ReservationUtil } from '@motionpicture/chevre-domain';
import * as crypto from 'crypto';
import * as mongoose from 'mongoose';
import * as util from 'util';

import GMOResultModel from '../../../../models/gmo/result';
import ReserveBaseController from '../../../ReserveBaseController';

/**
 * GMOクレジットカード決済コントローラー
 * todo OrderIDの仕様変更にともない、上映日と購入番号を取り出すように改修する必要あり
 *
 * @export
 * @class GMOReserveCreditController
 * @extends {ReserveBaseController}
 */
export default class GMOReserveCreditController extends ReserveBaseController {
    /**
     * GMOからの結果受信
     */
    public async result(gmoResultModel: GMOResultModel) {
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
        let reservations: mongoose.Document[] = [];
        try {
            console.log('finding reservations...payment_no:', gmoResultModel.OrderID);
            reservations = await Models.Reservation.find(
                {
                    payment_no: gmoResultModel.OrderID
                },
                '_id purchaser_group pre_customer'
            ).exec();
            console.log('reservations found.', reservations.length);

            if (reservations.length === 0) {
                throw new Error(this.req.__('Message.UnexpectedError'));
            }

            // チェック文字列
            // 8 ＋ 9 ＋ 10 ＋ 11 ＋ 12 ＋ 13 ＋ 14 ＋ ショップパスワード
            const data2cipher = util.format(
                '%s%s%s%s%s%s%s%s',
                gmoResultModel.OrderID,
                gmoResultModel.Forwarded,
                gmoResultModel.Method,
                gmoResultModel.PayTimes,
                gmoResultModel.Approve,
                gmoResultModel.TranID,
                gmoResultModel.TranDate,
                process.env.GMO_SHOP_PASS
            );
            const checkString = crypto.createHash('md5').update(data2cipher, 'utf8').digest('hex');
            console.log('CheckString must be ', checkString);
            if (checkString !== gmoResultModel.CheckString) {
                throw new Error(this.req.__('Message.UnexpectedError'));
            }
        } catch (error) {
            this.next(new Error(this.req.__('Message.UnexpectedError')));
            return;
        }

        try {
            // todo 正しい値に
            const performanceDay = 'xxx';
            const paymentNo = 'xxx';
            console.log('processFixReservations processing... update:', update);
            await this.processFixReservations(performanceDay, paymentNo, update);
            console.log('processFixReservations processed.');
        } catch (error) {
            // 売上取消したいところだが、結果通知も裏で動いているので、うかつにできない
            this.next(new Error(this.req.__('Message.ReservationNotCompleted')));
            return;
        }

        console.log('redirecting to complete...');
        // 購入者区分による振り分け
        const group = reservations[0].get('purchaser_group');
        switch (group) {
            case ReservationUtil.PURCHASER_GROUP_MEMBER:
                this.res.redirect(`/member/reserve/${gmoResultModel.OrderID}/complete`);
                break;

            default:
                if (reservations[0].get('pre_customer') !== undefined && reservations[0].get('pre_customer') !== null) {
                    this.res.redirect(`/pre/reserve/${gmoResultModel.OrderID}/complete`);
                } else {
                    this.res.redirect(`/customer/reserve/${gmoResultModel.OrderID}/complete`);
                }

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
                ShopID: process.env.GMO_SHOP_ID,
                ShopPass: process.env.GMO_SHOP_PASS,
                AccessID: gmoNotificationModel.AccessID,
                AccessPass: gmoNotificationModel.AccessPass,
                JobCd: GMOUtil.STATUS_CREDIT_SALES,
                Amount: gmoNotificationModel.Amount
            }
        };

        console.log('requesting... options:', options);
        request.post(options, (error, response, body) => {
            console.log('request processed.', error, response, body);

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
                ShopID: process.env.GMO_SHOP_ID,
                ShopPass: process.env.GMO_SHOP_PASS,
                AccessID: gmoNotificationModel.AccessID,
                AccessPass: gmoNotificationModel.AccessPass,
                JobCd: GMOUtil.STATUS_CREDIT_VOID,
                Amount: gmoNotificationModel.Amount
            }
        };

        console.log('requesting... options:', options);
        request.post(options, (error, response, body) => {
            console.log('request processed.', error, response, body);

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
