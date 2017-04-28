import { Models, ReservationEmailCueUtil, ReservationUtil } from '@motionpicture/chevre-domain';
import * as crypto from 'crypto';
import * as mongoose from 'mongoose';
import * as util from 'util';

import GMOResultModel from '../../../../models/gmo/result';
import ReserveBaseController from '../../../ReserveBaseController';

/**
 * GMOコンビニ決済コントローラー
 *
 * @export
 * @class GMOReserveCvsController
 * @extends {ReserveBaseController}
 */
export default class GMOReserveCvsController extends ReserveBaseController {
    /**
     * GMOからの結果受信
     */
    // tslint:disable-next-line:max-func-body-length
    public async result(gmoResultModel: GMOResultModel) {
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
            // 8 ＋ 23 ＋ 24 ＋ 25 ＋ 39 + 14 ＋ショップパスワード
            const data2cipher = util.format(
                '%s%s%s%s%s%s%s',
                gmoResultModel.OrderID,
                gmoResultModel.CvsCode,
                gmoResultModel.CvsConfNo,
                gmoResultModel.CvsReceiptNo,
                gmoResultModel.PaymentTerm,
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
            // 決済待ちステータスへ変更
            // todo 上映日を条件に含める必要あり
            console.log('updating reservations by paymentNo...', gmoResultModel.OrderID);
            const raw = await Models.Reservation.update(
                { payment_no: gmoResultModel.OrderID },
                {
                    gmo_shop_id: gmoResultModel.ShopID,
                    gmo_amount: gmoResultModel.Amount,
                    gmo_tax: gmoResultModel.Tax,
                    gmo_cvs_code: gmoResultModel.CvsCode,
                    gmo_cvs_conf_no: gmoResultModel.CvsConfNo,
                    gmo_cvs_receipt_no: gmoResultModel.CvsReceiptNo,
                    gmo_cvs_receipt_url: gmoResultModel.CvsReceiptUrl,
                    gmo_payment_term: gmoResultModel.PaymentTerm,
                    updated_user: 'GMOReserveCsvController'
                },
                { multi: true }
            ).exec();
            console.log('reservations updated.', raw);
        } catch (error) {
            this.next(new Error(this.req.__('Message.ReservationNotCompleted')));
            return;
        }

        // 仮予約完了メールキュー追加(あれば更新日時を更新するだけ)
        try {
            console.log('creating reservationEmailCue...');
            const cue = await Models.ReservationEmailCue.findOneAndUpdate(
                {
                    payment_no: gmoResultModel.OrderID,
                    template: ReservationEmailCueUtil.TEMPLATE_TEMPORARY
                },
                {
                    $set: { updated_at: Date.now() },
                    $setOnInsert: { status: ReservationEmailCueUtil.STATUS_UNSENT }
                },
                {
                    upsert: true,
                    new: true
                }
            ).exec();
            console.log('reservationEmailCue created.', cue);
        } catch (error) {
            // 失敗してもスルー(ログと運用でなんとかする)
        }

        console.log('redirecting to waitingSettlement...');

        // 購入者区分による振り分け
        const group = reservations[0].get('purchaser_group');
        switch (group) {
            case ReservationUtil.PURCHASER_GROUP_MEMBER:
                this.res.redirect(`/member/reserve/${gmoResultModel.OrderID}/waitingSettlement`);
                break;

            default:
                if (reservations[0].get('pre_customer') !== undefined && reservations[0].get('pre_customer') !== null) {
                    this.res.redirect(`/pre/reserve/${gmoResultModel.OrderID}/waitingSettlement`);
                } else {
                    this.res.redirect(`/customer/reserve/${gmoResultModel.OrderID}/waitingSettlement`);
                }

                break;
        }
    }
}
