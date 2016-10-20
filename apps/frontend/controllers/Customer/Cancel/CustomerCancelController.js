"use strict";
const BaseController_1 = require('../../BaseController');
const Models_1 = require('../../../../common/models/Models');
const ReservationUtil_1 = require('../../../../common/models/Reservation/ReservationUtil');
const GMOUtil_1 = require('../../../../common/Util/GMO/GMOUtil');
const customerCancelForm_1 = require('../../../forms/customer/customerCancelForm');
const log4js = require('log4js');
const conf = require('config');
const sendgrid = require('sendgrid');
const moment = require('moment');
const numeral = require('numeral');
const fs = require('fs-extra');
class CustomerCancelController extends BaseController_1.default {
    /**
     * チケットキャンセル
     */
    index() {
        if (this.req.method === 'POST') {
            let form = customerCancelForm_1.default(this.req);
            form(this.req, this.res, (err) => {
                if (!this.req.form.isValid) {
                    return this.res.json({
                        success: false,
                        message: '購入番号または電話番号下4ケタに誤りがあります<br>There are some mistakes in a transaction number or last 4 digits of tel.'
                    });
                }
                // 予約を取得(クレジットカード決済のみ)
                Models_1.default.Reservation.find({
                    payment_no: this.req.form['paymentNo'],
                    purchaser_tel: { $regex: `${this.req.form['last4DigitsOfTel']}$` },
                    purchaser_group: ReservationUtil_1.default.PURCHASER_GROUP_CUSTOMER,
                    status: ReservationUtil_1.default.STATUS_RESERVED
                }, (err, reservations) => {
                    if (err) {
                        return this.res.json({
                            success: false,
                            message: 'A system error has occurred. Please try again later. Sorry for the inconvenience.'
                        });
                    }
                    if (reservations.length === 0) {
                        return this.res.json({
                            success: false,
                            message: '購入番号または電話番号下4ケタに誤りがあります<br>There are some mistakes in a transaction number or last 4 digits of tel.'
                        });
                    }
                    if (reservations[0].get('payment_method') === GMOUtil_1.default.PAY_TYPE_CVS) {
                        return this.res.json({
                            success: false,
                            message: 'コンビニ決済のお客様は下記をご確認ください。<br>Please check the following if you paid at the convenience store.'
                        });
                    }
                    // 一次販売(15日)と先行販売(19日)のもののみ許可
                    if (moment(reservations[0].get('purchased_at')) >= moment('2016-10-16T00:00:00+9:00')) {
                        if (!reservations[0].get('pre_customer')) {
                            return this.res.json({
                                success: false,
                                message: 'キャンセル受付対象外の座席です。<br>The cancel for you tickets is not applicable.'
                            });
                        }
                    }
                    let results = reservations.map((reservation) => {
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
                            payment_method: reservation.get('payment_method')
                        };
                    });
                    this.res.json({
                        success: true,
                        message: null,
                        reservations: results
                    });
                });
            });
        }
        else {
            this.res.locals.paymentNo = '';
            this.res.locals.last4DigitsOfTel = '';
            this.res.render('customer/cancel');
        }
    }
    /**
     * 購入番号からキャンセルする
     */
    executeByPaymentNo() {
        this.logger = log4js.getLogger('cancel');
        let paymentNo = this.req.body.paymentNo;
        let last4DigitsOfTel = this.req.body.last4DigitsOfTel;
        this.logger.info('finding reservations...');
        Models_1.default.Reservation.find({
            payment_no: paymentNo,
            purchaser_tel: { $regex: `${last4DigitsOfTel}$` },
            purchaser_group: ReservationUtil_1.default.PURCHASER_GROUP_CUSTOMER,
            status: ReservationUtil_1.default.STATUS_RESERVED
        }, (err, reservations) => {
            this.logger.info('reservations found.', err, reservations);
            if (err)
                return this.res.json({ success: false, message: 'A system error has occurred. Please try again later. Sorry for the inconvenience.' });
            if (reservations.length === 0) {
                return this.res.json({
                    success: false,
                    message: '購入番号または電話番号下4ケタに誤りがあります There are some mistakes in a transaction number or last 4 digits of tel.'
                });
            }
            if (reservations[0].get('payment_method') === GMOUtil_1.default.PAY_TYPE_CVS) {
                return this.res.json({
                    success: false,
                    message: 'コンビニ決済のお客様は下記をご確認ください。 Please check the following if you paid at the convenience store.'
                });
            }
            // 一次販売(15日)と先行販売(19日)のもののみ許可
            if (moment(reservations[0].get('purchased_at')) >= moment('2016-10-16T00:00:00+9:00')) {
                if (!reservations[0].get('pre_customer')) {
                    return this.res.json({
                        success: false,
                        message: 'キャンセル受付対象外の座席です。 The cancel for you tickets is not applicable.'
                    });
                }
            }
            if (reservations[0].get('payment_method') === GMOUtil_1.default.PAY_TYPE_CREDIT) {
                this.logger.info('removing reservations by customer... payment_no:', paymentNo);
                Models_1.default.Reservation.remove({
                    payment_no: paymentNo,
                    purchaser_tel: { $regex: `${last4DigitsOfTel}$` },
                    purchaser_group: ReservationUtil_1.default.PURCHASER_GROUP_CUSTOMER,
                    status: ReservationUtil_1.default.STATUS_RESERVED
                }, (err) => {
                    this.logger.info('reservations removed by customer.', err, 'payment_no:', paymentNo);
                    if (err) {
                        return this.res.json({
                            success: false,
                            message: err.message
                        });
                    }
                    // キャンセルリクエスト保管
                    this.logger.info('creating CustomerCancelRequest...');
                    Models_1.default.CustomerCancelRequest.create({
                        payment_no: paymentNo,
                        payment_method: reservations[0].get('payment_method'),
                        email: reservations[0].get('purchaser_email'),
                        tel: reservations[0].get('purchaser_tel')
                    }, (err) => {
                        this.logger.info('CustomerCancelRequest created.', err);
                        if (err)
                            return this.res.json({ success: false, message: err.message });
                        // メール送信
                        let to = reservations[0].get('purchaser_email');
                        this.res.render('email/customer/cancel', {
                            layout: false,
                            to: to,
                            reservations: reservations,
                            moment: moment,
                            numeral: numeral,
                            conf: conf,
                            GMOUtil: GMOUtil_1.default,
                            ReservationUtil: ReservationUtil_1.default
                        }, (err, html) => {
                            this.logger.info('email rendered. html:', err, html);
                            // メール失敗してもキャンセル成功
                            if (err)
                                return this.res.json({ success: true, message: null });
                            let _sendgrid = sendgrid(conf.get('sendgrid_username'), conf.get('sendgrid_password'));
                            let email = new _sendgrid.Email({
                                to: to,
                                bcc: ['tiff_mp@motionpicture.jp'],
                                fromname: conf.get('email.fromname'),
                                from: conf.get('email.from'),
                                subject: `${(process.env.NODE_ENV !== 'prod') ? `[${process.env.NODE_ENV}]` : ''}東京国際映画祭チケット キャンセル完了のお知らせ Notice of Completion of Cancel for TIFF Tickets`,
                                html: html
                            });
                            // logo
                            email.addFile({
                                filename: `logo.png`,
                                contentType: 'image/png',
                                cid: 'logo',
                                content: fs.readFileSync(`${__dirname}/../../../../../public/images/email/logo.png`)
                            });
                            this.logger.info('sending an email...email:', email);
                            _sendgrid.send(email, (err, json) => {
                                this.logger.info('an email sent.', err, json);
                                // メールが送れなくてもキャンセルは成功
                                this.res.json({
                                    success: true,
                                    message: null
                                });
                            });
                        });
                    });
                });
            }
            else if (reservations[0].get('payment_method') === GMOUtil_1.default.PAY_TYPE_CVS) {
                // TODO
                return;
            }
            else {
                this.res.json({
                    success: false,
                    message: 'A system error has occurred. Please try again later. Sorry for the inconvenience.'
                });
            }
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = CustomerCancelController;
