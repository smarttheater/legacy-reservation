import ReserveBaseController from '../../ReserveBaseController';
import Util from '../../../../common/Util/Util';
import customerReserveTermsForm from '../../../forms/Customer/Reserve/customerReserveTermsForm';
import customerReservePerformanceForm from '../../../forms/Customer/Reserve/customerReservePerformanceForm';
import customerReserveSeatForm from '../../../forms/Customer/Reserve/customerReserveSeatForm';
import customerReserveTicketForm from '../../../forms/Customer/Reserve/customerReserveTicketForm';
import customerReserveProfileForm from '../../../forms/Customer/Reserve/customerReserveProfileForm';
import customerReservePayForm from '../../../forms/Customer/Reserve/customerReservePayForm';

import Models from '../../../../common/models/Models';
import ReservationUtil from '../../../../common/models/Reservation/ReservationUtil';

import ReservationModel from '../../../models/Reserve/ReservationModel';
import ReservationResultModel from '../../../models/Reserve/ReservationResultModel';

import form = require('express-form');
import moment = require('moment');
import crypto = require('crypto');

export default class CustomerReserveController extends ReserveBaseController {
    /**
     * 規約
     */
    public terms(): void {
        if (this.req.method === 'POST') {
            customerReserveTermsForm(this.req, this.res, (err) => {
                if (this.req.form.isValid) {
                    this.res.redirect(this.router.build('customer.reserve.start', {}));

                } else {
                    this.res.render('customer/reserve/terms', {
                    });

                }

            });
        } else {
            this.res.render('customer/reserve/terms', {
            });

        }

    }

    public start(): void {
        // 予約トークンを発行
        let token = Util.createToken();
        let reservationModel = new ReservationModel();
        reservationModel.token = token;

        // スケジュール選択へ
        this.logger.debug('saving reservationModel... ', reservationModel);
        reservationModel.save((err) => {
            this.res.redirect(this.router.build('customer.reserve.performances', {token: token}));
        });

    }

    /**
     * スケジュール選択
     */
    public performances(): void {
        let token = this.req.params.token;
        ReservationModel.find(token, (err, reservationModel) => {
            if (err || reservationModel === null) {
                return this.next(new Error('予約プロセスが中断されました'));
            }

            this.logger.debug('reservationModel is ', reservationModel);

            if (this.req.method === 'POST') {
                customerReservePerformanceForm(this.req, this.res, (err) => {
                    if (this.req.form.isValid) {
                        // パフォーマンスFIX
                        this.processFixPerformance(reservationModel, this.req.form['performanceId'], (err, reservationModel) => {
                            if (err) {
                                this.next(err);
                            } else {
                                this.logger.debug('saving reservationModel... ', reservationModel);
                                reservationModel.save((err) => {
                                    this.res.redirect(this.router.build('customer.reserve.seats', {token: token}));
                                });
                            }
                        });

                    } else {
                        this.res.render('customer/reserve/performances', {
                        });

                    }

                });
            } else {
                // 仮予約あればキャンセルする
                this.processCancelSeats(reservationModel, (err, reservationModel) => {
                    this.logger.debug('saving reservationModel... ', reservationModel);
                    reservationModel.save((err) => {
                        this.res.render('customer/reserve/performances', {
                        });
                    });
                });

            }
        });
    }

    /**
     * 座席選択
     */
    public seats(): void {
        let token = this.req.params.token;
        ReservationModel.find(token, (err, reservationModel) => {
            if (err || reservationModel === null) {
                return this.next(new Error('予約プロセスが中断されました'));
            }

            this.logger.debug('reservationModel is ', reservationModel);

            if (this.req.method === 'POST') {
                customerReserveSeatForm(this.req, this.res, (err) => {
                    if (this.req.form.isValid) {
                        let reservationIds: Array<string> = JSON.parse(this.req.form['reservationIds']);

                        // 座席FIX
                        this.processFixSeats(reservationModel, reservationIds, (err, reservationModel) => {
                            if (err) {
                                this.next(err);

                            } else {
                                this.logger.debug('saving reservationModel... ', reservationModel);
                                reservationModel.save((err) => {
                                    // 仮予約に失敗した座席コードがあった場合
                                    if (reservationIds.length > reservationModel.reservationIds.length) {
                                        // TODO メッセージ？
                                        let message = '座席を確保できませんでした。再度指定してください。';
                                        this.res.redirect(this.router.build('customer.reserve.seats', {token: token}) + `?message=${encodeURIComponent(message)}`);

                                    } else {
                                        this.res.redirect(this.router.build('customer.reserve.tickets', {token: token}));

                                    }

                                });

                            }
                        });

                    } else {
                        this.res.redirect(this.router.build('customer.reserve.seats', {token: token}));

                    }

                });
            } else {
                this.res.render('customer/reserve/seats', {
                    reservationModel: reservationModel,
                });

            }

        });
    }

    /**
     * 券種選択
     */
    public tickets(): void {
        let token = this.req.params.token;
        ReservationModel.find(token, (err, reservationModel) => {
            if (err || reservationModel === null) {
                return this.next(new Error('予約プロセスが中断されました'));
            }

            this.logger.debug('reservationModel is ', reservationModel);

            if (this.req.method === 'POST') {
                customerReserveTicketForm(this.req, this.res, (err) => {
                    if (this.req.form.isValid) {
                        // 座席選択情報を保存して座席選択へ
                        let choices = JSON.parse(this.req.form['choices']);

                        if (Array.isArray(choices)) {
                            choices.forEach((choice) => {
                                let reservation = reservationModel.getReservation(choice.reservation_id);
                                reservation.ticket_type = choice.ticket_type;
                                reservation.ticket_name = choice.ticket_name;
                                reservation.ticket_name_en = choice.ticket_name_en;
                                reservation.ticket_price = choice.ticket_price;

                                reservationModel.setReservation(reservation._id, reservation);
                            });

                            this.logger.debug('saving reservationModel... ', reservationModel);
                            reservationModel.save((err) => {
                                this.res.redirect(this.router.build('customer.reserve.profile', {token: token}));
                            });

                        } else {
                            this.next(new Error('不適切なアクセスです'));
                        }

                    } else {
                        this.res.redirect(this.router.build('customer.reserve.tickets', {token: token}));

                    }

                });
            } else {
                this.res.render('customer/reserve/tickets', {
                    reservationModel: reservationModel,
                });

            }

        });
    }

    /**
     * 購入者情報
     */
    public profile(): void {
        let token = this.req.params.token;
        ReservationModel.find(token, (err, reservationModel) => {
            if (err || reservationModel === null) {
                return this.next(new Error('予約プロセスが中断されました'));
            }

            this.logger.debug('reservationModel is ', reservationModel);

            if (this.req.method === 'POST') {
                customerReserveProfileForm(this.req, this.res, (err) => {
                    if (this.req.form.isValid) {
                        // 購入者情報を保存して座席選択へ
                        reservationModel.profile = {
                            last_name: this.req.form['lastName'],
                            first_name: this.req.form['firstName'],
                            email: this.req.form['email'],
                            tel: this.req.form['tel']
                        };

                        this.logger.debug('saving reservationModel... ', reservationModel);
                        reservationModel.save((err) => {
                            this.res.redirect(this.router.build('customer.reserve.pay', {token: token}));
                        });

                    } else {
                        this.res.render('customer/reserve/profile', {
                            reservationModel: reservationModel,
                        });

                    }

                });

            } else {
                this.res.locals.lastName = '';
                this.res.locals.firstName = '';
                this.res.locals.tel = '';
                this.res.locals.email = '';
                this.res.locals.emailConfirm = '';
                this.res.locals.emailConfirmDomain = '';

                if (process.env.NODE_ENV === 'dev') {
                    this.res.locals.lastName = 'てすとせい';
                    this.res.locals.firstName = 'てすとめい';
                    this.res.locals.tel = '09012345678';
                    this.res.locals.email = 'ilovegadd@gmail.com';
                    this.res.locals.emailConfirm = 'ilovegadd';
                    this.res.locals.emailConfirmDomain = 'gmail.com';
                }

                // セッションに情報があれば、フォーム初期値設定
                if (reservationModel.profile) {
                    let email = reservationModel.profile.email;
                    this.res.locals.lastName = reservationModel.profile.last_name;
                    this.res.locals.firstName = reservationModel.profile.first_name;
                    this.res.locals.tel = reservationModel.profile.tel;
                    this.res.locals.email = email;
                    this.res.locals.emailConfirm = email.substr(0, email.indexOf('@'));
                    this.res.locals.emailConfirmDomain = email.substr(email.indexOf('@') + 1);
                }

                this.res.render('customer/reserve/profile', {
                    reservationModel: reservationModel,
                });

            }

        });
    }

    /**
     * 決済方法選択
     */
    public pay(): void {
        let token = this.req.params.token;
        ReservationModel.find(token, (err, reservationModel) => {
            if (err || reservationModel === null) {
                return this.next(new Error('予約プロセスが中断されました'));
            }

            this.logger.debug('reservationModel is ', reservationModel);

            if (this.req.method === 'POST') {
                customerReservePayForm(this.req, this.res, (err) => {
                    if (this.req.form.isValid) {
                        // 決済方法情報を保存して座席選択へ
                        reservationModel.paymentMethod = this.req.form['method'];

                        this.logger.debug('saving reservationModel... ', reservationModel);
                        reservationModel.save((err) => {
                            this.res.redirect(this.router.build('customer.reserve.confirm', {token: token}));
                        });

                    } else {
                        this.res.render('customer/reserve/pay', {
                        });

                    }

                });

            } else {
                this.res.locals.method = '01';

                // セッションに情報があれば、フォーム初期値設定
                if (reservationModel.paymentMethod) {
                    this.res.locals.method = reservationModel.paymentMethod;
                }

                this.res.render('customer/reserve/pay', {
                    reservationModel: reservationModel,
                    ReservationUtil: ReservationUtil
                });

            }

        });
    }

    /**
     * 予約内容確認
     */
    public confirm(): void {
        let token = this.req.params.token;
        ReservationModel.find(token, (err, reservationModel) => {
            if (err || reservationModel === null) {
                return this.next(new Error('予約プロセスが中断されました'));
            }

            this.logger.debug('reservationModel is ', reservationModel);

            if (this.req.method === 'POST') {
                this.res.redirect(this.router.build('customer.reserve.process', {token: token}));
            } else {
                this.res.render('customer/reserve/confirm', {
                    reservationModel: reservationModel,
                    ReservationUtil: ReservationUtil
                });
            }
        });
    }

    public process(): void {
        let token = this.req.params.token;
        ReservationModel.find(token, (err, reservationModel) => {
            if (err || reservationModel === null) {
                return this.next(new Error('予約プロセスが中断されました'));
            }

            this.logger.debug('reservationModel is ', reservationModel);

            if (this.req.method === 'POST') {
            } else {

                // 予約情報セッション削除
                this.logger.debug('removing reservationModel... ', reservationModel);
                reservationModel.remove(() => {
                    if (err) {

                    } else {

                        switch (reservationModel.paymentMethod) {
                            case ReservationUtil.PAY_METHOD_CREDIT:
                                this.processCredit(reservationModel);

                                break;


                            case ReservationUtil.PAY_METHOD_CVS:
                                this.processCvs(reservationModel);

                                break;

                            default:
                                this.next(new Error('対応していない決済方法です'))

                                break;

                        }

                    }
                });
            }
        });
    }

    private processCredit(reservationModel: ReservationModel) {
        // GMOからの結果受信にそなえてセッションを新規に作成する
        reservationModel.token = Util.createToken();
        reservationModel.save((err) => {
            // GMOへ遷移画面
            let shopId = 'tshop00024015';
            let orderID = reservationModel.token; // 27桁まで
            let amount = reservationModel.getTotalPrice();
            let shopPassword = 'hf3wsuyy';
            let dateTime = moment().format('YYYYMMDDHHmmss');

            // 「ショップ ID + オーダーID + 利用金額＋税送料＋ショップパスワード + 日時情報」を MD5 でハッシュした文字列。
            let md5hash = crypto.createHash('md5');
            md5hash.update(`${shopId}${orderID}${amount}${shopPassword}${dateTime}`, 'utf8');
            let shopPassString = md5hash.digest('hex');


            this.res.render('customer/reserve/processCredit', {
                layout: false,
                reservationModel: reservationModel,
                shopId,
                orderID,
                amount,
                shopPassword,
                dateTime,
                shopPassString
            });

        });
    }

    private processCvs(reservationModel: ReservationModel) {
        // GMOからの結果受信にそなえてセッションを新規に作成する
        reservationModel.token = Util.createToken();
        reservationModel.save((err) => {
            // GMOへ遷移画面
            let shopId = 'tshop00024015';
            let orderID = reservationModel.token; // 27桁まで
            let amount = reservationModel.getTotalPrice();
            let shopPassword = 'hf3wsuyy';
            let dateTime = moment().format('YYYYMMDDHHmmss');

            // 「ショップ ID + オーダーID + 利用金額＋税送料＋ショップパスワード + 日時情報」を MD5 でハッシュした文字列。
            let md5hash = crypto.createHash('md5');
            md5hash.update(`${shopId}${orderID}${amount}${shopPassword}${dateTime}`, 'utf8');
            let shopPassString = md5hash.digest('hex');


            this.res.render('customer/reserve/processCVS', {
                layout: false,
                reservationModel: reservationModel,
                shopId,
                orderID,
                amount,
                shopPassword,
                dateTime,
                shopPassString
            });

        });
    }

    /**
     * GMOからの結果受信
     */
    public fromGMO(): void {
        this.logger.debug('fromGMP post paramerters:', this.req.body);
// console.log(this.req.body);
// { ShopID: 'tshop00024015',
//   JobCd: 'CAPTURE',
//   Amount: '1500',
//   Tax: '0',
//   Currency: '',
//   AccessID: '06ad45d3cbdf71653e1fad567d261da9',
//   AccessPass: 'a0dc0c0c462a56af4258df74000a3b48',
//   OrderID: '155b56af5c5110',
//   Forwarded: '2a99662',
//   Method: '1',
//   PayTimes: '',
//   Approve: '6956212',
//   TranID: '1607041919111111111111878951',
//   TranDate: '20160704191911',
//   CheckString: '98f01693a5c5c8d8ec446d0c00d4e394',
//   ErrCode: '',
//   ErrInfo: '',
//   NewCardFlag: '0',
//   PayType: '0',
//   CvsCode: '',
//   CvsConfNo: '',
//   CvsReceiptNo: '',
//   CvsReceiptUrl: '',
//   EdyReceiptNo: '',
//   EdyOrderNo: '',
//   SuicaReceiptNo: '',
//   SuicaOrderNo: '',
//   BkCode: '',
//   ConfNo: '',
//   PaymentTerm: '',
//   CustID: '',
//   EncryptReceiptNo: '',
//   AuPayInfoNo: '',
//   AuPayMethod: '',
//   AuCancelAmount: '',
//   AuCancelTax: '',
//   DocomoSettlementCode: '',
//   DocomoCancelAmount: '',
//   DocomoCancelTax: '',
//   SbTrackingId: '',
//   SbCancelAmount: '',
//   SbCancelTax: '',
//   JibunReceiptNo: '',
//   PayDescription: '',
//   CardNo: '************1111',
//   BeforeBalance: '',
//   AfterBalance: '',
//   CardActivateStatus: '',
//   CardTermStatus: '',
//   CardInvalidStatus: '',
//   CardWebInquiryStatus: '',
//   CardValidLimit: '',
//   CardTypeCode: '',
//   CarryInfo: '',
//   RequestNo: '',
//   AccountNo: '',
//   NetCashPayType: '',
//   RakutenIdItemId: '',
//   RakutenIdItemSubId: '',
//   RakutenIdItemName: '',
//   LinepayTranId: '',
//   LinepayPayMethod: [ '', '' ],
//   RecruitItemName: '',
//   RcOrderId: '',
//   RcOrderTime: '',
//   RcUsePoint: '',
//   RcUseCoupon: '',
//   RcUseShopCoupon: '',
//   VaBankCode: '',
//   VaBankName: '',
//   VaBranchCode: '',
//   VaBranchName: '',
//   VaAccountType: '',
//   VaAccountNumber: '',
//   VaAvailableDate: '',
//   VaTradeCode: '',
//   ClientField1: '',
//   ClientField2: '',
//   ClientField3: '' }
        let token = this.req.body.OrderID;
        ReservationModel.find(token, (err, reservationModel) => {
            if (err || reservationModel === null) {
                return this.next(new Error('予約プロセスが中断されました'));
            }

            this.logger.debug('reservationModel is ', reservationModel);

            if (this.req.method === 'POST') {
                // 決済方法
                let payType = this.req.body.PayType;
                switch (payType) {
                    // クレジットカード決済
                    case '0':

                        // 予約情報セッション削除
                        // これ以降、予約情報はローカルに引き回す
                        this.logger.debug('removing reservationModel... ', reservationModel);
                        reservationModel.remove(() => {
                            if (err) {

                            } else {
                                // TODO GMOからポストされたパラメータを予約情報に追加する

                                // 予約確定
                                this.processFixAll(reservationModel, (err, reservationModel) => {
                                    if (err) {
                                        // TODO 万が一の対応どうするか
                                        this.next(err);

                                    } else {
                                        // TODO 予約できていない在庫があった場合
                                        if (reservationModel.reservationIds.length > reservationModel.reservedDocuments.length) {
                                            this.res.redirect(this.router.build('customer.reserve.confirm', {token: token}));

                                        } else {
                                            // 予約結果セッションを保存して、完了画面へ
                                            let reservationResultModel = reservationModel.toReservationResult();

                                            this.logger.debug('saving reservationResult...', reservationResultModel);
                                            reservationResultModel.save((err) => {
                                                this.res.redirect(this.router.build('customer.reserve.complete', {token: token}));
                                            });

                                        }
                                    }
                                });

                            }
                        });

                        break;

                    // コンビニ決済
                    case '3':

                        // 決済待ちステータスへ変更
                        let promises = [];
                        reservationModel.reservationIds.forEach((reservationId, index) => {
                            let reservation = reservationModel.getReservation(reservationId);

                            promises.push(new Promise((resolve, reject) => {

                                this.logger.debug('updating reservation status to STATUS_WAITING_SETTLEMENT..._id:', reservationId);
                                Models.Reservation.findOneAndUpdate(
                                    {
                                        _id: reservationId,
                                    },
                                    {
                                        status: ReservationUtil.STATUS_WAITING_SETTLEMENT,
                                        updated_user: this.constructor.toString(),
                                    },
                                    {
                                        new: true
                                    },
                                (err, reservationDocument) => {
                                    this.logger.info('STATUS_TEMPORARY to STATUS_WAITING_SETTLEMENT processed.', err, reservationDocument, reservationModel);

                                    if (err) {
                                        // TODO ログ出力
                                        reject();

                                    } else {
                                        resolve();
                                    }

                                });

                            }));
                        });

                        Promise.all(promises).then(() => {
                            this.res.send('決済待ちステータス変更後の画面を表示する');

                        }, (err) => {
                            // TODO どうする？
                            this.next(err);

                        });
                        break;

                    default:
                        this.next(new Error('対応していない決済方法です'));

                        break;
                }
            }
        });

    }

    public complete(): void {
        let token = this.req.params.token;
        ReservationResultModel.find(token, (err, reservationResultModel) => {
            if (err || reservationResultModel === null) {
                return this.next(new Error('予約プロセスが中断されました'));
            }

            this.res.render('customer/reserve/complete', {
                reservationResultModel: reservationResultModel,
            });
        });
    }
}
