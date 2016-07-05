import ReserveBaseController from '../../ReserveBaseController';
import Util from '../../../../common/Util/Util';

import Models from '../../../../common/models/Models';
import ReservationUtil from '../../../../common/models/Reservation/ReservationUtil';

import ReservationModel from '../../../models/Reserve/ReservationModel';
import ReservationResultModel from '../../../models/Reserve/ReservationResultModel';

import moment = require('moment');
import crypto = require('crypto');
import conf = require('config');

export default class GMOReserveController extends ReserveBaseController {
    public start(): void {
        let token = this.req.params.token;
        ReservationModel.find(token, (err, reservationModel) => {
            if (err || reservationModel === null) {
                return this.next(new Error('予約プロセスが中断されました'));
            }

            this.logger.debug('reservationModel is ', reservationModel);

            // 予約情報セッション削除
            this.logger.debug('removing reservationModel... ', reservationModel);
            reservationModel.remove(() => {
                if (err) {

                } else {

                    switch (reservationModel.paymentMethod) {
                        case ReservationUtil.PAY_METHOD_CREDIT:

                            // GMOからの結果受信にそなえてセッションを新規に作成する
                            reservationModel.token = Util.createToken();
                            reservationModel.save((err) => {
                                // GMOへ遷移画面
                                let shopId = conf.get<string>('gmo_payment_shop_id');
                                let orderID = reservationModel.token; // 27桁まで
                                let amount = reservationModel.getTotalPrice();
                                let shopPassword = conf.get<string>('gmo_payment_shop_Password');
                                let dateTime = moment().format('YYYYMMDDHHmmss');

                                // 「ショップ ID + オーダーID + 利用金額＋税送料＋ショップパスワード + 日時情報」を MD5 でハッシュした文字列。
                                let md5hash = crypto.createHash('md5');
                                md5hash.update(`${shopId}${orderID}${amount}${shopPassword}${dateTime}`, 'utf8');
                                let shopPassString = md5hash.digest('hex');


                                this.res.render('gmo/reserve/startCredit', {
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

                            break;


                        case ReservationUtil.PAY_METHOD_CVS:
                            // GMOからの結果受信にそなえてセッションを新規に作成する
                            reservationModel.token = Util.createToken();
                            reservationModel.save((err) => {
                                // GMOへ遷移画面
                                let shopId = conf.get<string>('gmo_payment_shop_id');
                                let orderID = reservationModel.token; // 27桁まで
                                let amount = reservationModel.getTotalPrice();
                                let shopPassword = conf.get<string>('gmo_payment_shop_Password');
                                let dateTime = moment().format('YYYYMMDDHHmmss');

                                // 「ショップ ID + オーダーID + 利用金額＋税送料＋ショップパスワード + 日時情報」を MD5 でハッシュした文字列。
                                let md5hash = crypto.createHash('md5');
                                md5hash.update(`${shopId}${orderID}${amount}${shopPassword}${dateTime}`, 'utf8');
                                let shopPassString = md5hash.digest('hex');


                                this.res.render('gmo/reserve/startCVS', {
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

                            break;

                        default:
                            this.next(new Error('対応していない決済方法です'))

                            break;

                    }

                }
            });

        });

    }

    /**
     * GMOからの結果受信
     */
    public result(): void {
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
                // エラー結果の場合
                if (this.req.body.ErrCode) {
                    return this.res.send(`エラー結果を受信しました。 ErrCode:${this.req.body.ErrCode} ErrInfo:${this.req.body.ErrInfo}`);
                }
    
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
                                            this.next(new Error('決済を完了できませんでした'));

                                        } else {
                                            // 予約結果セッションを保存して、完了画面へ
                                            let reservationResultModel = reservationModel.toReservationResult();

                                            this.logger.debug('saving reservationResult...', reservationResultModel);
                                            reservationResultModel.save((err) => {
                                                this.logger.debug('redirecting complete page...token:', reservationResultModel.token);
                                                if (reservationModel.member) {
                                                    this.res.redirect(this.router.build('member.reserve.complete', {token: token}));

                                                } else {
                                                    this.res.redirect(this.router.build('customer.reserve.complete', {token: token}));
                                                }

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
                            if (reservationModel.member) {
                                this.res.redirect(this.router.build('member.reserve.waitingSettlement', {token: token}));

                            } else {
                                this.res.redirect(this.router.build('customer.reserve.waitingSettlement', {token: token}));

                            }

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
}
