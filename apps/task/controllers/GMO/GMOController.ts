import BaseController from '../BaseController';
import Constants from '../../../common/Util/Constants';
import Models from '../../../common/models/Models';
import ReservationUtil from '../../../common/models/Reservation/ReservationUtil';
import GMOUtil from '../../../common/Util/GMO/GMOUtil';

import moment = require('moment');
import conf = require('config');
import mongodb = require('mongodb');
import mongoose = require('mongoose');
import PerformanceStatusesModel from '../../../common/models/PerformanceStatusesModel';
import request = require('request');

let MONGOLAB_URI = conf.get<string>('mongolab_uri');

export default class GMOController extends BaseController {
    public alterTran2sales(): void {
        mongoose.connect(MONGOLAB_URI, {});

        // 仮売上かつ完了ステータスの予約を実売上に変更する
        Models.Reservation.find(
            {
                status: ReservationUtil.STATUS_RESERVED,
                gmo_status: GMOUtil.STATUS_CREDIT_AUTH
            },
            'gmo_access_id gmo_access_pass total_charge',
            {
                limit: 1
            },
        (err, reservationDocuments) => {
            if (err || reservationDocuments.length < 1) {
                mongoose.disconnect();
                process.exit(0);
            } else {

                let next = (reservationDocument) => {
                    console.log(reservationDocument);

                    let options = {
                        url: 'https://pt01.mul-pay.jp/payment/AlterTran.idPass',
                        // json: true,
                        form: {
                            ShopID: conf.get<string>('gmo_payment_shop_id'),
                            ShopPass: conf.get<string>('gmo_payment_shop_password'),
                            AccessID: reservationDocument.get('gmo_access_id'),
                            AccessPass: reservationDocument.get('gmo_access_pass'),
                            JobCd: GMOUtil.STATUS_CREDIT_SALES,
                            Amount: reservationDocument.get('total_charge')
                        }
                    };

                    request.post(options, (error, response, body) => {
                        if (!error && response.statusCode == 200) {
                            console.log('body', body);
                            // AccessID
                            // AccessPass
                            // Forward
                            // Approve
                            // TranID
                            // TranDate
                            // ErrCode
                            // ErrInfo

                            if (i === reservationDocuments.length - 1) {
                                this.logger.debug('success!');

                                mongoose.disconnect();
                                process.exit(0);

                            } else {
                                i++;
                                next(reservationDocuments[i]);

                            }

                        } else {
                            i++;
                            next(reservationDocuments[i]);

                        }
                    })


                }

                let i = 0;
                next(reservationDocuments[0]);

            }

        });
    }
}
