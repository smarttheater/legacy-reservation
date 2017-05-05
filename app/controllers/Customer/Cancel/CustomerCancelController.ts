import { Models, ReservationUtil } from '@motionpicture/chevre-domain';
import { Util as GMOUtil } from '@motionpicture/gmo-service';
import * as conf from 'config';
import * as createDebug from 'debug';
import * as fs from 'fs-extra';
import * as moment from 'moment';
import * as mongoose from 'mongoose';
import * as numeral from 'numeral';
import * as sendgrid from 'sendgrid';
import * as util from 'util';

import customerCancelForm from '../../../forms/customer/customerCancelForm';
import BaseController from '../../BaseController';

const debug = createDebug('chevre-frontend:controller:customerCancel');

/**
 * 一般予約キャンセルコントローラー
 *
 * @export
 * @class CustomerCancelController
 * @extends {BaseController}
 */
export default class CustomerCancelController extends BaseController {

    /**
     * チケットキャンセル
     * @method index
     * @returns {Promise<void>}
     */
    public async index(): Promise<void> {
        // 返金期限
        // if (moment('2016-11-19T00:00:00+09:00') <= moment()) {
        //     this.res.render('customer/cancel/outOfTerm', { layout: false });
        //     return;
        // }

        if (this.req.method === 'POST') {
            customerCancelForm(this.req);
            const validationResult = await this.req.getValidationResult();
            if (!validationResult.isEmpty()) {
                this.res.json({
                    success: false,
                    message: '購入番号または電話番号下4ケタに誤りがあります<br>There are some mistakes in a transaction number or last 4 digits of tel'
                });
                return;
            }
            try {
                // 予約を取得(クレジットカード決済のみ)
                const reservations = await Models.Reservation.find(
                    {
                        payment_no: this.req.body.paymentNo,
                        purchaser_tel: { $regex: `${this.req.body.last4DigitsOfTel}$` },
                        purchaser_group: ReservationUtil.PURCHASER_GROUP_CUSTOMER,
                        status: ReservationUtil.STATUS_RESERVED
                    }
                ).exec();

                if (reservations.length === 0) {
                    this.res.json({
                        success: false,
                        message: '購入番号または電話番号下4ケタに誤りがあります<br>There are some mistakes in a transaction number or last 4 digits of tel'
                    });
                    return;
                }

                try {
                    await validate(reservations);

                    const results = reservations.map((reservation) => {
                        return {
                            _id: reservation.get('_id'),
                            seat_code: reservation.get('seat_code'),
                            payment_no: reservation.get('payment_no'),
                            film_name: reservation.get('film_name'),
                            performance_start_str: reservation.get('performance_start_str'),
                            location_str: reservation.get('location_str'),
                            payment_method: reservation.get('payment_method'),
                            charge: reservation.get('charge')
                        };
                    });

                    this.res.json({
                        success: true,
                        message: null,
                        reservations: results
                    });
                    return;
                } catch (error) {
                    this.res.json({
                        success: false,
                        message: error.message
                    });
                    return;
                }
            } catch (error) {
                this.res.json({
                    success: false,
                    message: 'A system error has occurred. Please try again later. Sorry for the inconvenience'
                });
                return;
            }
        } else {
            this.res.locals.paymentNo = '';
            this.res.locals.last4DigitsOfTel = '';

            this.res.render('customer/cancel');
            return;
        }
    }

    /**
     * 購入番号からキャンセルする
     */
    // tslint:disable-next-line:max-func-body-length
    public async executeByPaymentNo(): Promise<void> {
        if (moment('2016-11-19T00:00:00+09:00') <= moment()) {
            this.res.json({
                success: false,
                message: 'Out of term'
            });
            return;
        }

        const paymentNo = this.req.body.paymentNo;
        const last4DigitsOfTel = this.req.body.last4DigitsOfTel;

        try {
            debug('finding reservations...');
            const reservations = await Models.Reservation.find(
                {
                    payment_no: paymentNo,
                    purchaser_tel: { $regex: `${last4DigitsOfTel}$` },
                    purchaser_group: ReservationUtil.PURCHASER_GROUP_CUSTOMER,
                    status: ReservationUtil.STATUS_RESERVED
                }
            ).exec();
            debug('reservations found', reservations);

            if (reservations.length === 0) {
                this.res.json({
                    success: false,
                    message: '購入番号または電話番号下4ケタに誤りがあります There are some mistakes in a transaction number or last 4 digits of tel'
                });
                return;
            }

            try {
                await validate(reservations);
            } catch (error) {
                this.res.json({
                    success: false,
                    message: error.message
                });
                return;
            }

            if (reservations[0].get('payment_method') === GMOUtil.PAY_TYPE_CREDIT) {
                debug('removing reservations by customer... payment_no:', paymentNo);
                await Models.Reservation.remove(
                    {
                        payment_no: paymentNo,
                        purchaser_tel: { $regex: `${last4DigitsOfTel}$` },
                        purchaser_group: ReservationUtil.PURCHASER_GROUP_CUSTOMER,
                        status: ReservationUtil.STATUS_RESERVED
                    }
                ).exec();
                debug('reservations removed by customer', 'payment_no:', paymentNo);

                // キャンセルリクエスト保管
                debug('creating CustomerCancelRequest...');
                await Models.CustomerCancelRequest.create(
                    {
                        payment_no: paymentNo,
                        payment_method: reservations[0].get('payment_method'),
                        email: reservations[0].get('purchaser_email'),
                        tel: reservations[0].get('purchaser_tel')
                    }
                );
                debug('CustomerCancelRequest created');

                // メール送信
                const to = reservations[0].get('purchaser_email');

                this.res.render(
                    'email/customer/cancel',
                    {
                        layout: false,
                        to: to,
                        reservations: reservations,
                        moment: moment,
                        numeral: numeral,
                        conf: conf,
                        GMOUtil: GMOUtil,
                        ReservationUtil: ReservationUtil
                    },
                    async (renderErr, html) => {
                        debug('email rendered. html:', renderErr, html);

                        // メール失敗してもキャンセル成功
                        if (renderErr instanceof Error) {
                            this.res.json({ success: true, message: null });
                        } else {
                            try {
                                debug('sending an email...');
                                await sendEmail(to, html);
                                debug('an email sent');
                            } catch (error) {
                                // メールが送れなくてもキャンセルは成功
                            }

                            this.res.json({
                                success: true,
                                message: null
                            });
                        }
                    }
                );

                // クレジットカードの場合、GMO取消しを行えば通知で空席になる(この方法は保留)
                // 取引状態参照
                // debug('SearchTrade processing...');
                // request.post({
                //     url: 'https://pt01.mul-pay.jp/payment/SearchTrade.idPass',
                //     form: {
                //         ShopID: process.env.GMO_SHOP_ID,
                //         ShopPass: process.env.GMO_SHOP_PASS,
                //         OrderID: paymentNo
                //     }
                // }, (error, response, body) => {
                //     debug('SearchTrade processed', error, body);
                //     if (error) {
                //         this.res.json({ success: false, message: this.req.__('Message.UnexpectedError') });
                //         return;
                //     }
                //     if (response.statusCode !== 200) {
                //         this.res.json({ success: false, message: this.req.__('Message.UnexpectedError') });
                //         return;
                //     }
                //     let searchTradeResult = querystring.parse(body);
                //     if (searchTradeResult['ErrCode']) {
                //         this.res.json({ success: false, message: this.req.__('Message.UnexpectedError') });
                //         return;
                //     }
                //     // 即時売上状態のみ先へ進める
                //     if (searchTradeResult.Status !== GMOUtil.STATUS_CREDIT_CAPTURE) {
                //         this.res.json({ success: false, message: this.req.__('Message.UnexpectedError') });
                //         return;
                //     }

                //     debug('searchTradeResult is ', searchTradeResult);

                //     // 決済変更
                //     debug('AlterTran processing...');
                //     request.post({
                //         url: 'https://pt01.mul-pay.jp/payment/AlterTran.idPass',
                //         form: {
                //             ShopID: process.env.GMO_SHOP_ID,
                //             ShopPass: process.env.GMO_SHOP_PASS,
                //             AccessID: searchTradeResult.AccessID,
                //             AccessPass: searchTradeResult.AccessPass,
                //             JobCd: GMOUtil.STATUS_CREDIT_VOID
                //         }
                //     }, (error, response, body) => {
                //         debug('AlterTran processed', error, body);
                //         if (error) {
                //             this.res.json({ success: false, message: this.req.__('Message.UnexpectedError') });
                //             return;
                //         }
                //         if (response.statusCode !== 200) {
                //             this.res.json({ success: false, message: this.req.__('Message.UnexpectedError') });
                //             return;
                //         }
                //         let alterTranResult = querystring.parse(body);
                //         if (alterTranResult['ErrCode']) {
                //             this.res.json({ success: false, message: this.req.__('Message.UnexpectedError') });
                //             return;
                //         }

                //         debug('alterTranResult is ', alterTranResult);
                //     });
                // });
            } else if (reservations[0].get('payment_method') === GMOUtil.PAY_TYPE_CVS) {
                // コンビニ決済の場合
                this.res.json({
                    success: false,
                    message: 'A system error has occurred. Please try again later. Sorry for the inconvenience'
                });
            } else {
                this.res.json({
                    success: false,
                    message: 'A system error has occurred. Please try again later. Sorry for the inconvenience'
                });
            }
        } catch (error) {
            this.res.json({
                success: false,
                message: 'A system error has occurred. Please try again later. Sorry for the inconvenience'
            });
        }
    }
}

/**
 * キャンセル受付対象かどうか確認する
 *
 * @ignore
 */
async function validate(reservations: mongoose.Document[]): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        // 入場済みの座席があるかどうか確認
        const notEntered = reservations.every((reservation) => (reservation.get('checked_in') !== true));
        if (!notEntered) {
            reject(new Error('キャンセル受付対象外の座席です。<br>The cancel for your tickets is not applicable'));
            return;
        }

        // 一次販売(15日)許可
        if (moment(reservations[0].get('purchased_at')) < moment('2016-10-16T00:00:00+09:00')) {
            resolve();
            return;
        }

        reject(new Error('キャンセル受付対象外の座席です。<br>The cancel for your tickets is not applicable'));
    });
}

/**
 * メールを送信する
 *
 * @ignore
 */
async function sendEmail(to: string, html: string): Promise<void> {
    const subject = util.format(
        '%s%s %s',
        (process.env.NODE_ENV !== 'production') ? `[${process.env.NODE_ENV}]` : '',
        'CHEVRE_EVENT_NAMEチケット キャンセル完了のお知らせ',
        'Notice of Completion of Cancel for CHEVRE Tickets'
    );
    const mail = new sendgrid.mail.Mail(
        new sendgrid.mail.Email(conf.get<string>('email.from'), conf.get<string>('email.fromname')),
        subject,
        new sendgrid.mail.Email(to),
        new sendgrid.mail.Content('text/html', html)
    );

    // logo
    const attachment = new sendgrid.mail.Attachment();
    attachment.setFilename('logo.png');
    attachment.setType('image/png');
    attachment.setContent(fs.readFileSync(`${__dirname}/../../../../public/images/email/logo.png`).toString('base64'));
    attachment.setDisposition('inline');
    attachment.setContentId('logo');
    mail.addAttachment(attachment);

    const sg = sendgrid(process.env.SENDGRID_API_KEY);
    const request = sg.emptyRequest({
        host: 'api.sendgrid.com',
        method: 'POST',
        path: '/v3/mail/send',
        headers: {},
        body: mail.toJSON(),
        queryParams: {},
        test: false,
        port: ''
    });
    await sg.API(request);
}
