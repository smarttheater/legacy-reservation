import BaseController from '../../BaseController';
import Util from '../../../../common/Util/Util';
import Models from '../../../../common/models/Models';
import ReservationUtil from '../../../../common/models/Reservation/ReservationUtil';
import GMOUtil from '../../../../common/Util/GMO/GMOUtil';
import customerCancelForm from '../../../forms/customer/customerCancelForm';
import log4js = require('log4js');
import conf = require('config');
import request = require('request');
import querystring = require('querystring');

export default class CustomerCancelController extends BaseController {

    /**
     * チケットキャンセル
     */
    public index(): void {
        if (this.req.method === 'POST') {
            let form = customerCancelForm(this.req);
            form(this.req, this.res, (err) => {
                if (!this.req.form.isValid) {
                    return this.res.json({
                        success: false,
                        message: this.req.__('Message.invalidPaymentNoOrLast4DigitsOfTel')
                    });
                }

                // 予約を取得(クレジットカード決済のみ)
                Models.Reservation.find(
                    {
                        payment_no: this.req.form['paymentNo'],
                        purchaser_tel: {$regex: `${this.req.form['last4DigitsOfTel']}$`},
                        purchaser_group: ReservationUtil.PURCHASER_GROUP_CUSTOMER,
                        status: ReservationUtil.STATUS_RESERVED
                    },
                    (err, reservations) => {
                        if (err) {
                            return this.res.json({
                                success: false,
                                message: this.req.__('Message.UnexpectedError')
                            });
                        }

                        if (reservations.length === 0) {
                            return this.res.json({
                                success: false,
                                message: this.req.__('Message.invalidPaymentNoOrLast4DigitsOfTel')
                            });
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
                    }
                );
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
        this.logger = log4js.getLogger('cancel');

        let paymentNo = this.req.body.paymentNo;
        let last4DigitsOfTel = this.req.body.last4DigitsOfTel;

        Models.Reservation.find(
            {
                payment_no: paymentNo,
                purchaser_tel: {$regex: `${last4DigitsOfTel}$`},
                purchaser_group: ReservationUtil.PURCHASER_GROUP_CUSTOMER,
                status: ReservationUtil.STATUS_RESERVED
            },
            (err, reservations) => {
                if (err) return this.res.json({success: false, message: this.req.__('Message.UnexpectedError')});

                if (reservations.length === 0) {
                    return this.res.json({
                        success: false,
                        message: this.req.__('Message.invalidPaymentNoOrLast4DigitsOfTel')
                    });
                }

                // クレジットカードの場合、GMO取消しを行えば通知で空席になる
                if (reservations[0].get('payment_method') === GMOUtil.PAY_TYPE_CREDIT) {
                    // 取引状態参照
                    this.logger.info('SearchTrade processing...');
                    request.post({
                        url: 'https://pt01.mul-pay.jp/payment/SearchTrade.idPass',
                        form: {
                            ShopID: conf.get<string>('gmo_payment_shop_id'),
                            ShopPass: conf.get<string>('gmo_payment_shop_password'),
                            OrderID: paymentNo
                        }
                    }, (error, response, body) => {
                        this.logger.info('SearchTrade processed.', error, body);
                        if (error) return this.res.json({success: false, message: this.req.__('Message.UnexpectedError')});
                        if (response.statusCode !== 200) return this.res.json({success: false, message: this.req.__('Message.UnexpectedError')});
                        let searchTradeResult = querystring.parse(body);
                        if (searchTradeResult['ErrCode']) return this.res.json({success: false, message: this.req.__('Message.UnexpectedError')});
                        if (searchTradeResult.Status !== GMOUtil.STATUS_CREDIT_CAPTURE) return this.res.json({success: false, message: this.req.__('Message.UnexpectedError')}); // 即時売上状態のみ先へ進める

                        this.logger.info('searchTradeResult is ', searchTradeResult);

                        // 決済変更
                        this.logger.info('AlterTran processing...');
                        request.post({
                            url: 'https://pt01.mul-pay.jp/payment/AlterTran.idPass',
                            form: {
                                ShopID: conf.get<string>('gmo_payment_shop_id'),
                                ShopPass: conf.get<string>('gmo_payment_shop_password'),
                                AccessID: searchTradeResult.AccessID,
                                AccessPass: searchTradeResult.AccessPass,
                                JobCd: GMOUtil.STATUS_CREDIT_VOID
                            }
                        }, (error, response, body) => {
                            this.logger.info('AlterTran processed.', error, body);
                            if (error) return this.res.json({success: false, message: this.req.__('Message.UnexpectedError')});
                            if (response.statusCode !== 200) return this.res.json({success: false, message: this.req.__('Message.UnexpectedError')});
                            let alterTranResult = querystring.parse(body);
                            if (alterTranResult['ErrCode']) return this.res.json({success: false, message: this.req.__('Message.UnexpectedError')});

                            this.logger.info('alterTranResult is ', alterTranResult);

                            // キャンセルリクエスト保管
                            Models.CustomerCancelRequest.create({
                                payment_no: paymentNo,
                                payment_method: reservations[0].get('payment_method'),
                                email: reservations[0].get('purchaser_email'),
                                tel: reservations[0].get('purchaser_tel')
                            }, (err) => {
                                if (err) return this.res.json({success: false, message: err.message});

                                // TODO メール送信

                                this.res.json({
                                    success: true,
                                    message: null
                                });
                            });
                        });
                    }); 
                // コンビニ決済の場合、口座情報を保管しつつ、同期的に予約削除
                } else if (reservations[0].get('payment_method') === GMOUtil.PAY_TYPE_CVS) {
                    // キャンセルリクエスト保管
                    Models.CustomerCancelRequest.create({
                        payment_no: paymentNo,
                        payment_method: reservations[0].get('payment_method'),
                        email: reservations[0].get('purchaser_email'),
                        tel: reservations[0].get('purchaser_tel')
                    }, (err) => {
                        if (err) return this.res.json({success: false, message: err.message});

                        this.logger.info('removing reservation by customer... payment_no:', paymentNo);
                        Models.Reservation.remove({
                            payment_no: paymentNo,
                            purchaser_tel: {$regex: `${last4DigitsOfTel}$`},
                            purchaser_group: ReservationUtil.PURCHASER_GROUP_CUSTOMER,
                            status: ReservationUtil.STATUS_RESERVED
                        }, (err) => {
                            this.logger.info('reservation removed by customer.', err, 'payment_no:', paymentNo);
                            if (err) {
                                return this.res.json({
                                    success: false,
                                    message: err.message
                                });
                            }

                            // TODO メール送信

                            this.res.json({
                                success: true,
                                message: null
                            });
                        });
                    });
                } else {
                    this.res.json({
                        success: false,
                        message: this.req.__('Message.UnexpectedError')
                    });
                }
            }
        );
    }
}
