import ReserveBaseController from '../../../ReserveBaseController';
import GMOUtil from '../../../../../common/Util/GMO/GMOUtil';
import Models from '../../../../../common/models/Models';
import ReservationUtil from '../../../../../common/models/Reservation/ReservationUtil';
import GMOResultModel from '../../../../models/Reserve/GMOResultModel';
import GMONotificationModel from '../../../../models/Reserve/GMONotificationModel';
import GMONotificationResponseModel from '../../../../models/Reserve/GMONotificationResponseModel';
import crypto = require('crypto');
import conf = require('config');

export default class GMOReserveCvsController extends ReserveBaseController {
    /**
     * GMOからの結果受信
     */
    public result(gmoResultModel: GMOResultModel): void {
        // 決済待ちステータスへ変更
        let update = {
            gmo_shop_id: gmoResultModel.ShopID,
            gmo_amount: gmoResultModel.Amount,
            gmo_tax: gmoResultModel.Tax,
            gmo_cvs_code: gmoResultModel.CvsCode,
            gmo_cvs_conf_no: gmoResultModel.CvsConfNo,
            gmo_cvs_receipt_no: gmoResultModel.CvsReceiptNo,
            gmo_cvs_receipt_url: gmoResultModel.CvsReceiptUrl,
            gmo_payment_term: gmoResultModel.PaymentTerm
        };

        // 内容の整合性チェック
        this.logger.info('finding reservations...payment_no:', gmoResultModel.OrderID);
        Models.Reservation.find(
            {
                payment_no: gmoResultModel.OrderID
            },
            '_id total_charge purchaser_group',
            (err, reservations) => {
                this.logger.info('reservations found.', err, reservations.length);
                if (err) return this.next(new Error(this.req.__('Message.UnexpectedError')));
                if (reservations.length === 0) return this.next(new Error(this.req.__('Message.UnexpectedError')));

                // 利用金額の整合性
                this.logger.info('Amount must be ', reservations[0].get('total_charge'));
                if (parseInt(gmoResultModel.Amount) !== reservations[0].get('total_charge')) {
                    return this.next(new Error(this.req.__('Message.UnexpectedError')));
                }

                // チェック文字列
                // 8 ＋ 23 ＋ 24 ＋ 25 ＋ 39 + 14 ＋ショップパスワード
                let md5hash = crypto.createHash('md5');
                md5hash.update(`${gmoResultModel.OrderID}${gmoResultModel.CvsCode}${gmoResultModel.CvsConfNo}${gmoResultModel.CvsReceiptNo}${gmoResultModel.PaymentTerm}${gmoResultModel.TranDate}${conf.get<string>('gmo_payment_shop_password')}`, 'utf8');
                let checkString = md5hash.digest('hex');

                this.logger.info('CheckString must be ', checkString);
                if (checkString !== gmoResultModel.CheckString) {
                    return this.next(new Error(this.req.__('Message.UnexpectedError')));
                }


                this.logger.info('processChangeStatus2waitingSettlement processing...update:', update);
                this.processChangeStatus2waitingSettlement(gmoResultModel.OrderID, update, (err) => {
                    this.logger.info('processChangeStatus2waitingSettlement processed.', err);
                    // 売上取消したいところだが、結果通知も裏で動いているので、うかつにできない
                    if (err) return this.next(new Error(this.req.__('Message.ReservationNotCompleted')));

                    this.logger.info('redirecting to waitingSettlement...');

                    // 購入者区分による振り分け
                    let group = reservations[0].get('purchaser_group');
                    switch (group) {
                        case ReservationUtil.PURCHASER_GROUP_MEMBER:
                            this.res.redirect(this.router.build('member.reserve.waitingSettlement', {paymentNo: gmoResultModel.OrderID}));
                            break;

                        default:
                            this.res.redirect(this.router.build('customer.reserve.waitingSettlement', {paymentNo: gmoResultModel.OrderID}));
                            break;
                    }
                });
            }
        );
    }


    /**
     * GMO結果通知受信
     */
    public notify(gmoNotificationModel: GMONotificationModel): void {
        let paymentNo = gmoNotificationModel.OrderID;
        let update;

        switch (gmoNotificationModel.Status) {
            case GMOUtil.STATUS_CVS_PAYSUCCESS:
                update = {
                    gmo_status: gmoNotificationModel.Status
                };


                // 内容の整合性チェック
                this.logger.info('finding reservations...payment_no:', gmoNotificationModel.OrderID);
                Models.Reservation.find(
                    {
                        payment_no: gmoNotificationModel.OrderID
                    },
                    '_id total_charge',
                    (err, reservationDocuments) => {
                        this.logger.info('reservations found.', err, reservationDocuments.length);
                        if (err) return this.res.send(GMONotificationResponseModel.RecvRes_NG);
                        if (reservationDocuments.length === 0) return this.res.send(GMONotificationResponseModel.RecvRes_NG);

                        // 利用金額の整合性
                        this.logger.info('Amount must be ', reservationDocuments[0].get('total_charge'));
                        if (parseInt(gmoNotificationModel.Amount) !== reservationDocuments[0].get('total_charge')) {
                            return this.res.send(GMONotificationResponseModel.RecvRes_NG);
                        }


                        this.logger.info('processFixReservations processing... update:', update);
                        this.processFixReservations(paymentNo, update, (err) => {
                            this.logger.info('processFixReservations processed.', err);
                            if (err) {
                                // AccessPassが************なので、売上取消要求は行えない
                                // 失敗した場合、約60分毎に5回再通知されるので、それをリトライとみなす
                                this.logger.info('sending response RecvRes_NG...gmoNotificationModel.Status:', gmoNotificationModel.Status);
                                this.res.send(GMONotificationResponseModel.RecvRes_NG);
                            } else {
                                this.logger.info('sending response RecvRes_OK...gmoNotificationModel.Status:', gmoNotificationModel.Status);
                                this.res.send(GMONotificationResponseModel.RecvRes_OK);
                            }
                        });
                    }
                );

                break;

            case GMOUtil.STATUS_CVS_REQSUCCESS:
                // 決済待ちステータスへ変更
                update = {
                    gmo_shop_id: gmoNotificationModel.ShopID,
                    gmo_amount: gmoNotificationModel.Amount,
                    gmo_tax: gmoNotificationModel.Tax,
                    gmo_cvs_code: gmoNotificationModel.CvsCode,
                    gmo_cvs_conf_no: gmoNotificationModel.CvsConfNo,
                    gmo_cvs_receipt_no: gmoNotificationModel.CvsReceiptNo,
                    gmo_payment_term: gmoNotificationModel.PaymentTerm
                };

                // 内容の整合性チェック
                this.logger.info('finding reservations...payment_no:', gmoNotificationModel.OrderID);
                Models.Reservation.find(
                    {
                        payment_no: gmoNotificationModel.OrderID
                    },
                    '_id total_charge',
                    (err, reservations) => {
                        this.logger.info('reservations found.', err, reservations.length);
                        if (err) return this.res.send(GMONotificationResponseModel.RecvRes_NG);
                        if (reservations.length === 0) return this.res.send(GMONotificationResponseModel.RecvRes_NG);

                        // 利用金額の整合性
                        this.logger.info('Amount must be ', reservations[0].get('total_charge'));
                        if (parseInt(gmoNotificationModel.Amount) !== reservations[0].get('total_charge')) {
                            return this.res.send(GMONotificationResponseModel.RecvRes_NG);
                        }


                        this.logger.info('processChangeStatus2waitingSettlement processing... update:', update);
                        this.processChangeStatus2waitingSettlement(gmoNotificationModel.OrderID, update, (err) => {
                            this.logger.info('processChangeStatus2waitingSettlement processed.', err);
                            if (err) {
                                this.logger.info('sending response RecvRes_NG...');
                                this.res.send(GMONotificationResponseModel.RecvRes_NG);
                            } else {
                                this.logger.info('sending response RecvRes_OK...');
                                this.res.send(GMONotificationResponseModel.RecvRes_OK);
                            }
                        });
                    }
                );

                break;

            case GMOUtil.STATUS_CVS_UNPROCESSED:
                this.res.send(GMONotificationResponseModel.RecvRes_OK);

                break;

            case GMOUtil.STATUS_CVS_PAYFAIL: // 決済失敗
            case GMOUtil.STATUS_CVS_EXPIRED: // 期限切れ
            case GMOUtil.STATUS_CVS_CANCEL: // 支払い停止
                // 空席に戻す
                this.logger.info('finding reservations...payment_no:', gmoNotificationModel.OrderID);
                Models.Reservation.find(
                    {
                        payment_no: gmoNotificationModel.OrderID
                    },
                    '_id total_charge',
                    (err, reservations) => {
                        this.logger.info('reservations found.', err, reservations.length);
                        if (err) return this.res.send(GMONotificationResponseModel.RecvRes_NG);
                        if (reservations.length === 0) return this.res.send(GMONotificationResponseModel.RecvRes_NG);

                        // 利用金額の整合性
                        this.logger.info('Amount must be ', reservations[0].get('total_charge'));
                        if (parseInt(gmoNotificationModel.Amount) !== reservations[0].get('total_charge')) {
                            this.logger.info('sending response RecvRes_NG...');
                            return this.res.send(GMONotificationResponseModel.RecvRes_NG);
                        }


                        this.logger.info('removing reservations...payment_no:', gmoNotificationModel.OrderID);
                        Models.Reservation.remove(
                            {
                                payment_no: gmoNotificationModel.OrderID
                            },
                            (err) => {
                                this.logger.info('reservation removed.', err);
                                if (err) {
                                    this.logger.info('sending response RecvRes_NG...');
                                    this.res.send(GMONotificationResponseModel.RecvRes_NG);
                                } else {
                                    this.logger.info('sending response RecvRes_OK...');
                                    this.res.send(GMONotificationResponseModel.RecvRes_OK);
                                }
                            }
                        );
                    }
                );

                break;

            default:
                this.res.send(GMONotificationResponseModel.RecvRes_NG);

                break;
        }

    }

    /**
     * 決済待ちステータスへ変更する
     * 
     * @param {string[]} reservationIds 予約IDリスト
     * @param {Object} update 追加更新パラメータ
     */
    protected processChangeStatus2waitingSettlement(paymentNo: string, update: Object, cb: (err: Error) => void): void {
        update['status'] = ReservationUtil.STATUS_WAITING_SETTLEMENT;
        update['updated_user'] = 'GMOReserveCsvController';

        // 決済待ちステータスへ変更
        this.logger.info('updating reservations by paymentNo...', paymentNo, update);
        Models.Reservation.update(
            {
                payment_no: paymentNo
            },
            update,
            {
                multi: true
            },
            (err, raw) => {
                this.logger.info('reservations updated.', err, raw);
                if (err) {
                    cb(new Error('any reservations not updated.'));
                } else {
                    cb(null);
                }
            }
        );
    }
}
