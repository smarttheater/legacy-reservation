"use strict";
const BaseController_1 = require('../BaseController');
const Models_1 = require('../../../common/models/Models');
const ReservationUtil_1 = require('../../../common/models/Reservation/ReservationUtil');
const FilmUtil_1 = require('../../../common/models/Film/FilmUtil');
class AdmissionController extends BaseController_1.default {
    constructor() {
        super(...arguments);
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
            // 劇場とスクリーンを取得
            Models_1.default.Theater.find({}, 'name', (err, theaters) => {
                Models_1.default.Screen.find({}, 'name theater', (err, screens) => {
                    let screensByTheater = {};
                    for (let screen of screens) {
                        if (!screensByTheater.hasOwnProperty(screen.get('theater'))) {
                            screensByTheater[screen.get('theater')] = [];
                        }
                        screensByTheater[screen.get('theater')].push(screen);
                    }
                    this.res.render('admission/performances', {
                        FilmUtil: FilmUtil_1.default,
                        theaters: theaters,
                        screensByTheater: screensByTheater
                    });
                });
            });
        }
    }
    confirm() {
        Models_1.default.Performance.findOne({ _id: this.req.params.id })
            .populate('film', 'name')
            .populate('screen', 'name')
            .populate('theater', 'name')
            .exec((err, performance) => {
            if (err)
                this.next(new Error('Message.UnexpectedError'));
            Models_1.default.Reservation.find({
                performance: performance.get('_id'),
                status: ReservationUtil_1.default.STATUS_RESERVED
            }, 'seat_code ticket_type_code ticket_type_name_ja ticket_type_name_en entered payment_no payment_seat_index').exec((err, reservations) => {
                if (err)
                    this.next(new Error('Message.UnexpectedError'));
                let reservationsById = {};
                let reservationIdsByQrStr = {};
                for (let reservation of reservations) {
                    reservationsById[reservation.get('_id')] = reservation;
                    reservationIdsByQrStr[reservation.get('qr_str')] = reservation.get('_id').toString();
                }
                this.res.render('admission/confirm', {
                    performance: performance,
                    reservationsById: reservationsById,
                    reservationIdsByQrStr: reservationIdsByQrStr
                });
            });
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AdmissionController;
