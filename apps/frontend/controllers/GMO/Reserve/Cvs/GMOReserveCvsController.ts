import ReserveBaseController from '../../../ReserveBaseController';
import Util from '../../../../../common/Util/Util';
import GMOUtil from '../../../../../common/Util/GMO/GMOUtil';

import Models from '../../../../../common/models/Models';
import ReservationUtil from '../../../../../common/models/Reservation/ReservationUtil';

import ReservationModel from '../../../../models/Reserve/ReservationModel';
import ReservationResultModel from '../../../../models/Reserve/ReservationResultModel';
import GMOResultModel from '../../../../models/Reserve/GMOResultModel';
import GMONotificationModel from '../../../../models/Reserve/GMONotificationModel';
import GMONotificationResponseModel from '../../../../models/Reserve/GMONotificationResponseModel';

import moment = require('moment');
import crypto = require('crypto');
import conf = require('config');

export default class GMOReserveCvsController extends ReserveBaseController {
    /**
     * GMOからの結果受信
     */
    public result(reservationModel: ReservationModel, gmoResultModel: GMOResultModel): void {

        // 決済待ちステータスへ変更
        let promises = [];
        reservationModel.reservationIds.forEach((reservationId, index) => {
            let reservation = reservationModel.getReservation(reservationId);

            promises.push(new Promise((resolve, reject) => {

                this.logger.debug('updating reservation status to STATUS_WAITING_SETTLEMENT..._id:', reservationId);
                Models.Reservation.findOneAndUpdate(
                    {
                        _id: reservationId,
                        status: ReservationUtil.STATUS_TEMPORARY
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
                this.res.redirect(this.router.build('member.reserve.waitingSettlement', {token: reservationModel.token}));

            } else {
                this.res.redirect(this.router.build('customer.reserve.waitingSettlement', {token: reservationModel.token}));

            }

        }, (err) => {
            // TODO どうする？
            this.next(err);

        });

    }


    /**
     * GMO結果通知受信
     */
    public notify(reservationModel: ReservationModel, gmoNotificationModel: GMONotificationModel): void {
        // コンビニ決済
        // 4 入金通知 ○
        // 5 期限切れ ○
        // 6 支払い停止 ○

        let promises: Array<Promise<Function>> = [];
        switch (gmoNotificationModel.Status) {
            case GMOUtil.STATUS_CVS_PAYSUCCESS:
                // 決済待ちの予約を予約完了へ
                // 予約情報セッション削除
                // これ以降、予約情報はローカルに引き回す
                this.logger.debug('removing reservationModel... ', reservationModel);
                reservationModel.remove((err) => {
                    if (err) {
                        // TODO ログ

                    } else {
                        // TODO GMOからポストされたパラメータを予約情報に追加する

                        // 予約確定
                        this.processFixAll(reservationModel, (err, reservationModel) => {
                            if (err) {
                                // TODO 万が一の対応どうするか
                                this.res.send(GMONotificationResponseModel.RecvRes_NG);

                            } else {
                                // TODO 予約できていない在庫があった場合
                                if (reservationModel.reservationIds.length > reservationModel.reservedDocuments.length) {
                                    this.res.send(GMONotificationResponseModel.RecvRes_NG);

                                } else {
                                    // 完了
                                    this.res.send(GMONotificationResponseModel.RecvRes_OK);

                                }
                            }
                        });

                    }
                });

                break;

            case GMOUtil.STATUS_CVS_REQSUCCESS:
                // 決済待ちステータスへ変更
                reservationModel.reservationIds.forEach((reservationId, index) => {
                    let reservation = reservationModel.getReservation(reservationId);

                    promises.push(new Promise((resolve, reject) => {

                        this.logger.debug('updating reservation status to STATUS_WAITING_SETTLEMENT..._id:', reservationId);
                        Models.Reservation.findOneAndUpdate(
                            {
                                _id: reservationId,
                                status: ReservationUtil.STATUS_TEMPORARY
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
                    this.res.send(GMONotificationResponseModel.RecvRes_OK);

                }, (err) => {
                    // TODO どうする？
                    this.res.send(GMONotificationResponseModel.RecvRes_NG);

                });

                break;

            case GMOUtil.STATUS_CVS_UNPROCESSED:
                this.res.send(GMONotificationResponseModel.RecvRes_OK);

                break;

            case GMOUtil.STATUS_CVS_PAYFAIL: // 決済失敗
            case GMOUtil.STATUS_CVS_EXPIRED: // 期限切れ
            case GMOUtil.STATUS_CVS_CANCEL: // 支払い停止

                this.logger.debug('removing reservationModel... ', reservationModel);
                reservationModel.remove((err) => {
                    if (err) {
                        // TODO ログ

                    } else {
                        // 空席に戻す
                        reservationModel.reservationIds.forEach((reservationId, index) => {
                            let reservation = reservationModel.getReservation(reservationId);

                            promises.push(new Promise((resolve, reject) => {

                                this.logger.debug('updating reservation status to STATUS_AVAILABLE..._id:', reservationId);
                                Models.Reservation.findOneAndUpdate(
                                    {
                                        _id: reservationId
                                    },
                                    {
                                        status: ReservationUtil.STATUS_AVAILABLE,
                                        updated_user: this.constructor.toString()
                                    },
                                    {
                                        new: true
                                    },
                                (err, reservationDocument) => {
                                    this.logger.info('STATUS_WAITING_SETTLEMENT to STATUS_AVAILABLE processed.', err, reservationDocument, reservationModel);

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
                            this.res.send(GMONotificationResponseModel.RecvRes_OK);

                        }, (err) => {
                            // TODO どうする？
                            this.res.send(GMONotificationResponseModel.RecvRes_NG);

                        });

                        this.res.send(GMONotificationResponseModel.RecvRes_NG);

                    }
                });

                break;

            default:
                this.res.send(GMONotificationResponseModel.RecvRes_NG);

                break;
        }

    }
}
