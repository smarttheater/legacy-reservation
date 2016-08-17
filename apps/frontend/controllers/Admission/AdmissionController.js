"use strict";
const BaseController_1 = require('../BaseController');
const Models_1 = require('../../../common/models/Models');
const ReservationUtil_1 = require('../../../common/models/Reservation/ReservationUtil');
const FilmUtil_1 = require('../../../common/models/Film/FilmUtil');
class AdmissionController extends BaseController_1.default {
    performances() {
        this.res.render('admission/performances', {
            layout: 'layouts/admission/layout',
            FilmUtil: FilmUtil_1.default
        });
    }
    confirm() {
        let performanceId = this.req.params.id;
        Models_1.default.Reservation.find({
            performance: performanceId,
            status: ReservationUtil_1.default.STATUS_RESERVED
        }).exec((err, reservations) => {
            let reservationsById = {};
            for (let reservation of reservations) {
                reservationsById[reservation.get('_id')] = reservation;
            }
            this.res.render('admission/confirm', {
                layout: 'layouts/admission/layout',
                reservationsById: reservationsById
            });
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AdmissionController;
