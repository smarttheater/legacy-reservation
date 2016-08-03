"use strict";
const BaseController_1 = require('../BaseController');
const Models_1 = require('../../../common/models/Models');
const ReservationUtil_1 = require('../../../common/models/Reservation/ReservationUtil');
const GMOUtil_1 = require('../../../common/Util/GMO/GMOUtil');
const conf = require('config');
const mongoose = require('mongoose');
const request = require('request');
const querystring = require('querystring');
let MONGOLAB_URI = conf.get('mongolab_uri');
class GMOController extends BaseController_1.default {
    alterTran2sales() {
        mongoose.connect(MONGOLAB_URI, {});
        // 仮売上かつ完了ステータスの予約を実売上に変更する
        Models_1.default.Reservation.find({
            status: ReservationUtil_1.default.STATUS_RESERVED,
            gmo_status: GMOUtil_1.default.STATUS_CREDIT_AUTH
        }, 'gmo_access_id gmo_access_pass total_charge', {
            limit: 1
        }, (err, reservationDocuments) => {
            if (err || reservationDocuments.length < 1) {
                mongoose.disconnect();
                process.exit(0);
            }
            else {
                let next = (reservationDocument) => {
                    let options = {
                        url: 'https://pt01.mul-pay.jp/payment/AlterTran.idPass',
                        form: {
                            ShopID: conf.get('gmo_payment_shop_id'),
                            ShopPass: conf.get('gmo_payment_shop_password'),
                            AccessID: reservationDocument.get('gmo_access_id'),
                            AccessPass: reservationDocument.get('gmo_access_pass'),
                            JobCd: GMOUtil_1.default.STATUS_CREDIT_SALES,
                            Amount: reservationDocument.get('total_charge')
                        }
                    };
                    request.post(options, (error, response, body) => {
                        if (!error && response.statusCode == 200) {
                            let result = querystring.parse(body);
                            // AccessID
                            // AccessPass
                            // Forward
                            // Approve
                            // TranID
                            // TranDate
                            // ErrCode
                            // ErrInfo
                            if (result.hasOwnProperty('ErrCode')) {
                            }
                            else {
                            }
                            if (i === reservationDocuments.length - 1) {
                                this.logger.debug('success!');
                                mongoose.disconnect();
                                process.exit(0);
                            }
                            else {
                                i++;
                                next(reservationDocuments[i]);
                            }
                        }
                        else {
                            i++;
                            next(reservationDocuments[i]);
                        }
                    });
                };
                let i = 0;
                next(reservationDocuments[0]);
            }
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = GMOController;
