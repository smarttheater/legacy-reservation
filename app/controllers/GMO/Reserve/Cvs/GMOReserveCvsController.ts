import { EmailQueueUtil, Models, ReservationUtil } from '@motionpicture/chevre-domain';
import * as GMO from '@motionpicture/gmo-service';
import * as conf from 'config';
import * as crypto from 'crypto';
import * as createDebug from 'debug';
import * as express from 'express';
import * as moment from 'moment';
import * as mongoose from 'mongoose';
import * as numeral from 'numeral';
import * as util from 'util';

import GMOResultModel from '../../../../models/gmo/result';
import ReserveBaseController from '../../../ReserveBaseController';

const debug = createDebug('chevre-frontend:controller:gmo:reserve:cvs');

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
        // GMOのオーダーIDから上映日と購入番号を取り出す
        const parsedOrderId = ReservationUtil.parseGMOOrderId(gmoResultModel.OrderID);

        // 内容の整合性チェック
        let reservations: mongoose.Document[] = [];
        try {
            debug('finding reservations...payment_no:', parsedOrderId.paymentNo);
            reservations = await Models.Reservation.find(
                {
                    performance_day: parsedOrderId.performanceDay,
                    payment_no: parsedOrderId.paymentNo
                },
                '_id purchaser_group'
            ).exec();
            debug('reservations found.', reservations.length);

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
            debug('CheckString must be ', checkString);
            if (checkString !== gmoResultModel.CheckString) {
                throw new Error(this.req.__('Message.UnexpectedError'));
            }

        } catch (error) {
            this.next(new Error(this.req.__('Message.UnexpectedError')));
            return;
        }

        try {
            // 決済待ちステータスへ変更
            debug('updating reservations by paymentNo...', gmoResultModel.OrderID);
            const raw = await Models.Reservation.update(
                {
                    performance_day: parsedOrderId.performanceDay,
                    payment_no: parsedOrderId.paymentNo
                },
                {
                    gmo_shop_id: gmoResultModel.ShopID,
                    gmo_order_id: gmoResultModel.OrderID,
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
            debug('reservations updated.', raw);
        } catch (error) {
            this.next(new Error(this.req.__('Message.ReservationNotCompleted')));
            return;
        }

        // 仮予約完了メールキュー追加(あれば更新日時を更新するだけ)
        try {
            const emailQueue = createEmailQueue(this.res, reservations[0].get('performance_day'), parsedOrderId.paymentNo);
            await Models.EmailQueue.create(emailQueue);
        } catch (error) {
            console.error(error);
            // 失敗してもスルー(ログと運用でなんとかする)
        }

        debug('redirecting to waitingSettlement...');

        // 購入者区分による振り分け
        const group = reservations[0].get('purchaser_group');
        switch (group) {
            case ReservationUtil.PURCHASER_GROUP_MEMBER:
                this.res.redirect(`/member/reserve/${gmoResultModel.OrderID}/waitingSettlement`);
                break;

            default:
                this.res.redirect(`/customer/reserve/${gmoResultModel.OrderID}/waitingSettlement`);
                break;
        }
    }
}

/**
 * 完了メールキューインタフェース
 *
 * @interface IEmailQueue
 */
interface IEmailQueue {
    // tslint:disable-next-line:no-reserved-keywords
    from: { // 送信者
        address: string;
        name: string;
    };
    to: { // 送信先
        address: string;
        name?: string;
    };
    subject: string;
    content: { // 本文
        mimetype: string;
        text: string;
    };
    status: string;
}

/**
 * 仮予約完了メールを作成する
 *
 * @memberOf ReserveBaseController
 */
async function createEmailQueue(res: express.Response, performanceDay: string, paymentNo: string): Promise<IEmailQueue> {
    const reservations = await Models.Reservation.find({
        performance_day: performanceDay,
        payment_no: paymentNo
    }).exec();
    debug('reservations for email found.', reservations.length);
    if (reservations.length === 0) {
        throw new Error(`reservations of payment_no ${paymentNo} not found`);
    }

    let to = '';
    switch (reservations[0].get('purchaser_group')) {
        case ReservationUtil.PURCHASER_GROUP_STAFF:
            to = reservations[0].get('staff_email');
            break;

        default:
            to = reservations[0].get('purchaser_email');
            break;
    }

    debug('to is', to);
    if (to.length === 0) {
        throw new Error('email to unknown');
    }

    const titleJa = 'CHEVRE_EVENT_NAMEチケット 仮予約完了のお知らせ';
    const titleEn = 'Notice of Completion of Tentative Reservation for CHEVRE Tickets';

    debug('rendering template...');
    return new Promise<IEmailQueue>((resolve, reject) => {
        res.render(
            'email/reserve/waitingSettlement',
            {
                layout: false,
                title_ja: titleJa,
                title_en: titleEn,
                reservations: reservations,
                moment: moment,
                numeral: numeral,
                conf: conf,
                GMOUtil: GMO.Util,
                ReservationUtil: ReservationUtil
            },
            async (renderErr, text) => {
                debug('email template rendered.', renderErr);
                if (renderErr instanceof Error) {
                    reject(new Error('failed in rendering an email.'));
                    return;
                }

                const emailQueue = {
                    from: { // 送信者
                        address: conf.get<string>('email.from'),
                        name: conf.get<string>('email.fromname')
                    },
                    to: { // 送信先
                        address: to
                        // name: 'testto'
                    },
                    subject: `${titleJa} ${titleEn}`,
                    content: { // 本文
                        mimetype: 'text/plain',
                        text: text
                    },
                    status: EmailQueueUtil.STATUS_UNSENT
                };
                resolve(emailQueue);
            });
    });
}
