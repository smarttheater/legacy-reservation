import BaseController from '../BaseController';
import Models from '../../../common/models/Models';
import mongoose = require('mongoose');
import conf = require('config');
import ReservationUtil from '../../../common/models/Reservation/ReservationUtil';

let MONGOLAB_URI = conf.get<string>('mongolab_uri');

export default class TestController extends BaseController {
    public publishPaymentNo(): void {
        mongoose.connect(MONGOLAB_URI, {});
        ReservationUtil.publishPaymentNo((err, paymentNo) => {
            this.logger.info('paymentNo is', paymentNo);
            mongoose.disconnect();
            process.exit(0);
        });
    }
}
