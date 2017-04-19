"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const chevre_domain_1 = require("@motionpicture/chevre-domain");
const chevre_domain_2 = require("@motionpicture/chevre-domain");
const conf = require("config");
const fs = require("fs-extra");
const log4js = require("log4js");
const moment = require("moment");
const numeral = require("numeral");
const sendgrid = require("sendgrid");
const util = require("util");
const GMOUtil = require("../../../../common/Util/GMO/GMOUtil");
const customerCancelForm_1 = require("../../../forms/customer/customerCancelForm");
const BaseController_1 = require("../../BaseController");
/**
 * 一般予約キャンセルコントローラー
 *
 * @export
 * @class CustomerCancelController
 * @extends {BaseController}
 */
class CustomerCancelController extends BaseController_1.default {
    /**
     * チケットキャンセル
     * @method index
     * @returns {Promise<void>}
     */
    index() {
        return __awaiter(this, void 0, void 0, function* () {
            if (moment('2016-11-19T00:00:00+09:00') <= moment()) {
                this.res.render('customer/cancel/outOfTerm', { layout: false });
                return;
            }
            if (this.req.method === 'POST') {
                customerCancelForm_1.default(this.req);
                const validationResult = yield this.req.getValidationResult();
                if (!validationResult.isEmpty()) {
                    this.res.json({
                        success: false,
                        message: '購入番号または電話番号下4ケタに誤りがあります<br>There are some mistakes in a transaction number or last 4 digits of tel'
                    });
                    return;
                }
                try {
                    // 予約を取得(クレジットカード決済のみ)
                    const reservations = yield chevre_domain_1.Models.Reservation.find({
                        payment_no: this.req.body.paymentNo,
                        purchaser_tel: { $regex: `${this.req.body.last4DigitsOfTel}$` },
                        purchaser_group: chevre_domain_2.ReservationUtil.PURCHASER_GROUP_CUSTOMER,
                        status: chevre_domain_2.ReservationUtil.STATUS_RESERVED
                    }).exec();
                    if (reservations.length === 0) {
                        this.res.json({
                            success: false,
                            message: '購入番号または電話番号下4ケタに誤りがあります<br>There are some mistakes in a transaction number or last 4 digits of tel'
                        });
                        return;
                    }
                    try {
                        yield validate(reservations);
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
                        return;
                    }
                    catch (error) {
                        this.res.json({
                            success: false,
                            message: error.message
                        });
                        return;
                    }
                }
                catch (error) {
                    this.res.json({
                        success: false,
                        message: 'A system error has occurred. Please try again later. Sorry for the inconvenience'
                    });
                    return;
                }
            }
            else {
                this.res.locals.paymentNo = '';
                this.res.locals.last4DigitsOfTel = '';
                this.res.render('customer/cancel');
                return;
            }
        });
    }
    /**
     * 購入番号からキャンセルする
     */
    // tslint:disable-next-line:max-func-body-length
    executeByPaymentNo() {
        return __awaiter(this, void 0, void 0, function* () {
            if (moment('2016-11-19T00:00:00+09:00') <= moment()) {
                this.res.json({
                    success: false,
                    message: 'Out of term'
                });
                return;
            }
            this.logger = log4js.getLogger('cancel');
            const paymentNo = this.req.body.paymentNo;
            const last4DigitsOfTel = this.req.body.last4DigitsOfTel;
            try {
                this.logger.info('finding reservations...');
                const reservations = yield chevre_domain_1.Models.Reservation.find({
                    payment_no: paymentNo,
                    purchaser_tel: { $regex: `${last4DigitsOfTel}$` },
                    purchaser_group: chevre_domain_2.ReservationUtil.PURCHASER_GROUP_CUSTOMER,
                    status: chevre_domain_2.ReservationUtil.STATUS_RESERVED
                }).exec();
                this.logger.info('reservations found', reservations);
                if (reservations.length === 0) {
                    this.res.json({
                        success: false,
                        message: '購入番号または電話番号下4ケタに誤りがあります There are some mistakes in a transaction number or last 4 digits of tel'
                    });
                    return;
                }
                try {
                    yield validate(reservations);
                }
                catch (error) {
                    this.res.json({
                        success: false,
                        message: error.message
                    });
                    return;
                }
                if (reservations[0].get('payment_method') === GMOUtil.PAY_TYPE_CREDIT) {
                    this.logger.info('removing reservations by customer... payment_no:', paymentNo);
                    yield chevre_domain_1.Models.Reservation.remove({
                        payment_no: paymentNo,
                        purchaser_tel: { $regex: `${last4DigitsOfTel}$` },
                        purchaser_group: chevre_domain_2.ReservationUtil.PURCHASER_GROUP_CUSTOMER,
                        status: chevre_domain_2.ReservationUtil.STATUS_RESERVED
                    }).exec();
                    this.logger.info('reservations removed by customer', 'payment_no:', paymentNo);
                    // キャンセルリクエスト保管
                    this.logger.info('creating CustomerCancelRequest...');
                    yield chevre_domain_1.Models.CustomerCancelRequest.create({
                        payment_no: paymentNo,
                        payment_method: reservations[0].get('payment_method'),
                        email: reservations[0].get('purchaser_email'),
                        tel: reservations[0].get('purchaser_tel')
                    });
                    this.logger.info('CustomerCancelRequest created');
                    // メール送信
                    const to = reservations[0].get('purchaser_email');
                    this.res.render('email/customer/cancel', {
                        layout: false,
                        to: to,
                        reservations: reservations,
                        moment: moment,
                        numeral: numeral,
                        conf: conf,
                        GMOUtil: GMOUtil,
                        ReservationUtil: chevre_domain_2.ReservationUtil
                    }, (renderErr, html) => __awaiter(this, void 0, void 0, function* () {
                        this.logger.info('email rendered. html:', renderErr, html);
                        // メール失敗してもキャンセル成功
                        if (renderErr instanceof Error) {
                            this.res.json({ success: true, message: null });
                        }
                        else {
                            try {
                                this.logger.info('sending an email...');
                                yield sendEmail(to, html);
                                this.logger.info('an email sent');
                            }
                            catch (error) {
                                // メールが送れなくてもキャンセルは成功
                            }
                            this.res.json({
                                success: true,
                                message: null
                            });
                        }
                    }));
                    // クレジットカードの場合、GMO取消しを行えば通知で空席になる(この方法は保留)
                    // 取引状態参照
                    // this.logger.info('SearchTrade processing...');
                    // request.post({
                    //     url: 'https://pt01.mul-pay.jp/payment/SearchTrade.idPass',
                    //     form: {
                    //         ShopID: conf.get<string>('gmo_payment_shop_id'),
                    //         ShopPass: conf.get<string>('gmo_payment_shop_password'),
                    //         OrderID: paymentNo
                    //     }
                    // }, (error, response, body) => {
                    //     this.logger.info('SearchTrade processed', error, body);
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
                    //         this.logger.info('AlterTran processed', error, body);
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
                    //         this.logger.info('alterTranResult is ', alterTranResult);
                    //     });
                    // });
                }
                else if (reservations[0].get('payment_method') === GMOUtil.PAY_TYPE_CVS) {
                    // コンビニ決済の場合
                    this.res.json({
                        success: false,
                        message: 'A system error has occurred. Please try again later. Sorry for the inconvenience'
                    });
                }
                else {
                    this.res.json({
                        success: false,
                        message: 'A system error has occurred. Please try again later. Sorry for the inconvenience'
                    });
                }
            }
            catch (error) {
                this.res.json({
                    success: false,
                    message: 'A system error has occurred. Please try again later. Sorry for the inconvenience'
                });
            }
        });
    }
}
exports.default = CustomerCancelController;
/**
 * キャンセル受付対象かどうか確認する
 *
 * @ignore
 */
function validate(reservations) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            // 入場済みの座席があるかどうか確認
            const notEntered = reservations.every((reservation) => (reservation.get('entered') !== true));
            if (!notEntered) {
                reject(new Error('キャンセル受付対象外の座席です。<br>The cancel for your tickets is not applicable'));
                return;
            }
            // 一次販売(15日)許可
            if (moment(reservations[0].get('purchased_at')) < moment('2016-10-16T00:00:00+09:00')) {
                resolve();
                return;
            }
            // 先行販売(19日)許可
            if (reservations[0].get('pre_customer') !== undefined && reservations[0].get('pre_customer') !== null) {
                resolve();
                return;
            }
            reject(new Error('キャンセル受付対象外の座席です。<br>The cancel for your tickets is not applicable'));
        });
    });
}
/**
 * メールを送信する
 *
 * @ignore
 */
function sendEmail(to, html) {
    return __awaiter(this, void 0, void 0, function* () {
        const subject = util.format('%s%s %s', (process.env.NODE_ENV !== 'production') ? `[${process.env.NODE_ENV}]` : '', 'CHEVRE_EVENT_NAMEチケット キャンセル完了のお知らせ', 'Notice of Completion of Cancel for CHEVRE Tickets');
        const mail = new sendgrid.mail.Mail(new sendgrid.mail.Email(conf.get('email.from'), conf.get('email.fromname')), subject, new sendgrid.mail.Email(to), new sendgrid.mail.Content('text/html', html));
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
        yield sg.API(request);
    });
}
