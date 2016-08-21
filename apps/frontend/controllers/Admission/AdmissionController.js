"use strict";
const BaseController_1 = require('../BaseController');
const Models_1 = require('../../../common/models/Models');
const ReservationUtil_1 = require('../../../common/models/Reservation/ReservationUtil');
const FilmUtil_1 = require('../../../common/models/Film/FilmUtil');
class AdmissionController extends BaseController_1.default {
    constructor(...args) {
        super(...args);
        this.layout = 'layouts/admission/layout';
    }
    performances() {
        if (this.req.method === 'POST') {
            if (this.req.body.performanceId) {
                this.res.redirect(this.router.build('admission.confirm', { id: this.req.body.performanceId }));
            }
            else {
                this.res.redirect(this.router.build('admission.performances'));
            }
        }
        else {
            this.res.render('admission/performances', {
                FilmUtil: FilmUtil_1.default
            });
        }
    }
    confirm() {
        Models_1.default.Performance.findById(this.req.params.id)
            .populate('film', 'name')
            .populate('screen', 'name')
            .populate('theater', 'name')
            .exec((err, performance) => {
            if (err)
                this.next(new Error('Message.UnexpectedError'));
            Models_1.default.Reservation.find({
                performance: performance.get('_id'),
                status: ReservationUtil_1.default.STATUS_RESERVED
            }, 'status seat_code ticket_type_code ticket_type_name_ja ticket_type_name_en ticket_type_charge')
                .exec((err, reservations) => {
                if (err)
                    this.next(new Error('Message.UnexpectedError'));
                let reservationsById = {};
                for (let reservation of reservations) {
                    reservationsById[reservation.get('_id')] = reservation;
                }
                this.res.render('admission/confirm', {
                    performance: performance,
                    reservationsById: reservationsById
                });
            });
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AdmissionController;
