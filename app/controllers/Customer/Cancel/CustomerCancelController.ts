import { Models } from '@motionpicture/chevre-domain';
import { ReservationUtil } from '@motionpicture/chevre-domain';
import * as conf from 'config';
import * as fs from 'fs-extra';
import * as log4js from 'log4js';
import * as moment from 'moment';
import * as mongoose from 'mongoose';
import * as numeral from 'numeral';
import * as sendgrid from 'sendgrid';
import * as GMOUtil from '../../../../common/Util/GMO/GMOUtil';
import customerCancelForm from '../../../forms/customer/customerCancelForm';
import BaseController from '../../BaseController';

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
     */
    public index(): void {
        if (moment('2016-11-19T00:00:00+09:00') <= moment()) {
            return this.res.render('customer/cancel/outOfTerm', { layout: false });
        }

        if (this.req.method === 'POST') {
            const form = customerCancelForm(this.req);
            form(this.req, this.res, () => {
                if (this.req.form && !this.req.form.isValid) {
                    this.res.json({
                        success: false,
                        message: '購入番号または電話番号下4ケタに誤りがあります<br>There are some mistakes in a transaction number or last 4 digits of tel.'
                    });
                } else {
                    // 予約を取得(クレジットカード決済のみ)
                    Models.Reservation.find(
                        {
                            payment_no: (<any>this.req.form).paymentNo,
                            purchaser_tel: { $regex: `${(<any>this.req.form).last4DigitsOfTel}$` },
                            purchaser_group: ReservationUtil.PURCHASER_GROUP_CUSTOMER,
                            status: ReservationUtil.STATUS_RESERVED
                        },
                        (findReservationErr, reservations) => {
                            if (findReservationErr) {
                                this.res.json({
                                    success: false,
                                    message: 'A system error has occurred. Please try again later. Sorry for the inconvenience.'
                                });
                            } else {
                                if (reservations.length === 0) {
                                    this.res.json({
                                        success: false,
                                        message: '購入番号または電話番号下4ケタに誤りがあります<br>There are some mistakes in a transaction number or last 4 digits of tel.'
                                    });
                                } else {
                                    validate(reservations, (validateErr) => {
                                        if (validateErr) {
                                            this.res.json({
                                                success: false,
                                                message: validateErr.message
                                            });
                                        } else {
                                            const results = reservations.map((reservation) => {
                                                return {
                                                    _id: reservation.get('_id'),
                                                    seat_code: reservation.get('seat_code'),
                                                    payment_no: reservation.get('payment_no'),
                                                    film_name_ja: reservation.get('film_name_ja'),
                                                    film_name_en: reservation.get('film_name_en'),
                                                    performance_start_str_ja: reservation.get('performance_start_str_ja'),
                                                    performance_start_str_en: reservation.get('performance_start_str_en'),
                                                    location_str_ja: reservation.get('location_str_ja'),
                                                    location_str_en: reservation.get('location_str_en'),
                                                    payment_method: reservation.get('payment_method'),
                                                    charge: reservation.get('charge')
                                                };
                                            });

                                            this.res.json({
                                                success: true,
                                                message: null,
                                                reservations: results
                                            });
                                        }
                                    });
                                }
                            }
                        }
                    );
                }
            });
        } else {
            this.res.locals.paymentNo = '';
            this.res.locals.last4DigitsOfTel = '';

            this.res.render('customer/cancel');
        }
    }

    /**
     * 購入番号からキャンセルする
     */
    public executeByPaymentNo(): void {
        if (moment('2016-11-19T00:00:00+09:00') <= moment()) {
            this.res.json({
                success: false,
                message: 'Out of term.'
            });
            return;
        }

        this.logger = log4js.getLogger('cancel');

        const paymentNo = this.req.body.paymentNo;
        const last4DigitsOfTel = this.req.body.last4DigitsOfTel;

        this.logger.info('finding reservations...');
        Models.Reservation.find(
            {
                payment_no: paymentNo,
                purchaser_tel: { $regex: `${last4DigitsOfTel}$` },
                purchaser_group: ReservationUtil.PURCHASER_GROUP_CUSTOMER,
                status: ReservationUtil.STATUS_RESERVED
            },
            (err, reservations) => {
                this.logger.info('reservations found.', err, reservations);
                if (err) {
                    this.res.json({ success: false, message: 'A system error has occurred. Please try again later. Sorry for the inconvenience.' });
                } else {
                    if (reservations.length === 0) {
                        this.res.json({
                            success: false,
                            message: '購入番号または電話番号下4ケタに誤りがあります There are some mistakes in a transaction number or last 4 digits of tel.'
                        });
                    } else {
                        // tslint:disable-next-line:max-func-body-length
                        validate(reservations, (validateErr) => {
                            if (validateErr) {
                                this.res.json({
                                    success: false,
                                    message: validateErr.message
                                });
                            } else {
                                if (reservations[0].get('payment_method') === GMOUtil.PAY_TYPE_CREDIT) {
                                    this.logger.info('removing reservations by customer... payment_no:', paymentNo);
                                    Models.Reservation.remove(
                                        {
                                            payment_no: paymentNo,
                                            purchaser_tel: { $regex: `${last4DigitsOfTel}$` },
                                            purchaser_group: ReservationUtil.PURCHASER_GROUP_CUSTOMER,
                                            status: ReservationUtil.STATUS_RESERVED
                                        },
                                        (removeReservationErr) => {
                                            this.logger.info('reservations removed by customer.', removeReservationErr, 'payment_no:', paymentNo);
                                            if (removeReservationErr) {
                                                this.res.json({
                                                    success: false,
                                                    message: removeReservationErr.message
                                                });
                                            } else {
                                                // キャンセルリクエスト保管
                                                this.logger.info('creating CustomerCancelRequest...');
                                                Models.CustomerCancelRequest.create(
                                                    {
                                                        payment_no: paymentNo,
                                                        payment_method: reservations[0].get('payment_method'),
                                                        email: reservations[0].get('purchaser_email'),
                                                        tel: reservations[0].get('purchaser_tel')
                                                    },
                                                    (createReservationErr: any) => {
                                                        this.logger.info('CustomerCancelRequest created.', createReservationErr);
                                                        if (createReservationErr) {
                                                            this.res.json({ success: false, message: createReservationErr.message });
                                                        } else {
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
                                                                (renderErr, html) => {
                                                                    this.logger.info('email rendered. html:', renderErr, html);

                                                                    // メール失敗してもキャンセル成功
                                                                    if (renderErr) {
                                                                        this.res.json({ success: true, message: null });
                                                                    } else {
                                                                        this.logger.info('sending an email...');
                                                                        sendEmail(to, html, (sendEmailErr) => {
                                                                            this.logger.info('an email sent.', sendEmailErr);
                                                                            // メールが送れなくてもキャンセルは成功
                                                                            this.res.json({
                                                                                success: true,
                                                                                message: null
                                                                            });
                                                                        });
                                                                    }
                                                                }
                                                            );
                                                        }
                                                    }
                                                );
                                            }
                                        }
                                    );

                                    // クレジットカードの場合、GMO取消しを行えば通知で空席になる(この方法は保留)
                                    // // 取引状態参照
                                    // this.logger.info('SearchTrade processing...');
                                    // request.post({
                                    //     url: 'https://pt01.mul-pay.jp/payment/SearchTrade.idPass',
                                    //     form: {
                                    //         ShopID: conf.get<string>('gmo_payment_shop_id'),
                                    //         ShopPass: conf.get<string>('gmo_payment_shop_password'),
                                    //         OrderID: paymentNo
                                    //     }
                                    // }, (error, response, body) => {
                                    //     this.logger.info('SearchTrade processed.', error, body);
                                    //     if (error) return this.res.json({success: false, message: this.req.__('Message.UnexpectedError')});
                                    //     if (response.statusCode !== 200) return this.res.json({success: false, message: this.req.__('Message.UnexpectedError')});
                                    //     let searchTradeResult = querystring.parse(body);
                                    //     if (searchTradeResult['ErrCode']) return this.res.json({success: false, message: this.req.__('Message.UnexpectedError')});
                                    //     if (searchTradeResult.Status !== GMOUtil.STATUS_CREDIT_CAPTURE) return this.res.json({success: false, message: this.req.__('Message.UnexpectedError')}); // 即時売上状態のみ先へ進める

                                    //     this.logger.info('searchTradeResult is ', searchTradeResult);

                                    //     // 決済変更
                                    //     this.logger.info('AlterTran processing...');
                                    //     request.post({
                                    //         url: 'https://pt01.mul-pay.jp/payment/AlterTran.idPass',
                                    //         form: {
                                    //             ShopID: conf.get<string>('gmo_payment_shop_id'),
                                    //             ShopPass: conf.get<string>('gmo_payment_shop_password'),
                                    //             AccessID: searchTradeResult.AccessID,
                                    //             AccessPass: searchTradeResult.AccessPass,
                                    //             JobCd: GMOUtil.STATUS_CREDIT_VOID
                                    //         }
                                    //     }, (error, response, body) => {
                                    //         this.logger.info('AlterTran processed.', error, body);
                                    //         if (error) return this.res.json({success: false, message: this.req.__('Message.UnexpectedError')});
                                    //         if (response.statusCode !== 200) return this.res.json({success: false, message: this.req.__('Message.UnexpectedError')});
                                    //         let alterTranResult = querystring.parse(body);
                                    //         if (alterTranResult['ErrCode']) return this.res.json({success: false, message: this.req.__('Message.UnexpectedError')});

                                    //         this.logger.info('alterTranResult is ', alterTranResult);
                                    //     });
                                    // });
                                    // コンビニ決済の場合
                                } else if (reservations[0].get('payment_method') === GMOUtil.PAY_TYPE_CVS) {
                                    this.res.json({
                                        success: false,
                                        message: 'A system error has occurred. Please try again later. Sorry for the inconvenience.'
                                    });
                                } else {
                                    this.res.json({
                                        success: false,
                                        message: 'A system error has occurred. Please try again later. Sorry for the inconvenience.'
                                    });
                                }
                            }
                        });
                    }
                }
            }
        );
    }
}

/**
 * キャンセル受付対象かどうか確認する
 *
 * @ignore
 */
function validate(reservations: mongoose.Document[], cb: (err: Error | null) => void): void {
    // 入場済みの座席があるかどうか確認
    const notEntered = reservations.every((reservation) => !reservation.get('entered'));
    if (!notEntered) return cb(new Error('キャンセル受付対象外の座席です。<br>The cancel for your tickets is not applicable.'));

    // 一次販売(15日)許可
    if (moment(reservations[0].get('purchased_at')) < moment('2016-10-16T00:00:00+09:00')) return cb(null);

    // 先行販売(19日)許可
    if (reservations[0].get('pre_customer')) return cb(null);

    return cb(new Error('キャンセル受付対象外の座席です。<br>The cancel for your tickets is not applicable.'));
}

/**
 * メールを送信する
 *
 * @ignore
 */
function sendEmail(to: string, html: string, cb: (err: Error | null) => void): void {
    const mail = new sendgrid.mail.Mail(
        new sendgrid.mail.Email(conf.get<string>('email.from'), conf.get<string>('email.fromname')),
        `${(process.env.NODE_ENV !== 'production') ? `[${process.env.NODE_ENV}]` : ''}CHEVRE_EVENT_NAMEチケット キャンセル完了のお知らせ Notice of Completion of Cancel for CHEVRE Tickets`,
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
    sg.API(request).then(
        () => {
            cb(null);
        },
        (sendErr) => {
            cb(sendErr);
        }
    );
}
