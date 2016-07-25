import BaseController from '../BaseController';

import Models from '../../../common/models/Models';
import ReservationUtil from '../../../common/models/Reservation/ReservationUtil';

import moment = require('moment');

export default class AdmissionController extends BaseController {
    public create(): void {
        let reservationId = this.req.body.reservationId;
        this.res.json({
            isSuccess: true
        });
    }
}
