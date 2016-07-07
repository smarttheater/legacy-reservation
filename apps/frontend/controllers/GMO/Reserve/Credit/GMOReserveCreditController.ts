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

export default class GMOReserveCreditController extends ReserveBaseController {
    /**
     * GMOからの結果受信
     */
    public result(reservationModel: ReservationModel, gmoResultModel: GMOResultModel): void {
        // TODO バッチ処理側で予約完了処理をするとすると、ここでは完了ページにいきなり遷移してもいいかもしれない
        // バッチ処理が遅ければ、決済中です...みたいな表記とか

        // 予約情報セッション削除
        // これ以降、予約情報はローカルに引き回す
        this.logger.info('removing reservationModel... ');
        reservationModel.remove((err) => {
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

                            this.logger.info('saving reservationResult...', reservationResultModel.toLog());
                            reservationResultModel.save((err) => {
                                this.logger.info('redirecting to complete...');
                                if (reservationModel.member) {
                                    this.res.redirect(this.router.build('member.reserve.complete', {token: reservationModel.token}));

                                } else {
                                    this.res.redirect(this.router.build('customer.reserve.complete', {token: reservationModel.token}));
                                }

                            });

                        }
                    }
                });

            }
        });

    }


    /**
     * GMO結果通知受信
     */
    public notify(reservationModel: ReservationModel, gmoNotificationModel: GMONotificationModel): void {

        switch (gmoNotificationModel.Status) {
            case GMOUtil.STATUS_CREDIT_CAPTURE:
                // 予約情報セッション削除
                // これ以降、予約情報はローカルに引き回す
                // TODO バッチで消してしまうと、ブラウザで完了ページを表示できない(仕様検討)
                // this.logger.info('removing reservationModel... ');
                // reservationModel.remove((err) => {
                //     if (err) {

                //     } else {
                        // TODO GMOからポストされたパラメータを予約情報に追加する

                        // 予約確定
                        this.processFixAll(reservationModel, (err, reservationModel) => {
                            if (err) {
                                // TODO 万が一の対応どうするか
                                this.logger.info('sending response RecvRes_NG...', err);
                                this.res.send(GMONotificationResponseModel.RecvRes_NG);

                            } else {
                                // TODO 予約できていない在庫があった場合
                                if (reservationModel.reservationIds.length > reservationModel.reservedDocuments.length) {
                                    this.logger.info('sending response RecvRes_NG...');
                                    this.res.send(GMONotificationResponseModel.RecvRes_NG);

                                } else {
                                    this.logger.info('sending response RecvRes_OK...');
                                    this.res.send(GMONotificationResponseModel.RecvRes_OK);

                                }
                            }
                        });

                //     }
                // });

                break;

            case GMOUtil.STATUS_CREDIT_UNPROCESSED:
                this.res.send(GMONotificationResponseModel.RecvRes_NG);

                break;

            case GMOUtil.STATUS_CREDIT_AUTHENTICATED:
                this.res.send(GMONotificationResponseModel.RecvRes_NG);

                break;

            case GMOUtil.STATUS_CREDIT_CHECK:
                this.res.send(GMONotificationResponseModel.RecvRes_NG);

                break;

            case GMOUtil.STATUS_CREDIT_AUTH:
                this.res.send(GMONotificationResponseModel.RecvRes_NG);

                break;

            case GMOUtil.STATUS_CREDIT_SALES:
                this.res.send(GMONotificationResponseModel.RecvRes_NG);

                break;

            case GMOUtil.STATUS_CREDIT_VOID:
                this.res.send(GMONotificationResponseModel.RecvRes_NG);

                break;

            case GMOUtil.STATUS_CREDIT_RETURN:
                this.res.send(GMONotificationResponseModel.RecvRes_NG);

                break;

            case GMOUtil.STATUS_CREDIT_RETURNX:
                this.res.send(GMONotificationResponseModel.RecvRes_NG);

                break;

            case GMOUtil.STATUS_CREDIT_SAUTH:
                this.res.send(GMONotificationResponseModel.RecvRes_NG);

                break;

            default:
                this.res.send(GMONotificationResponseModel.RecvRes_OK);

                break;
        }

    }
}
