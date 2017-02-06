"use strict";
const BaseController_1 = require("../BaseController");
const ttts_domain_1 = require("@motionpicture/ttts-domain");
const ttts_domain_2 = require("@motionpicture/ttts-domain");
const ttts_domain_3 = require("@motionpicture/ttts-domain");
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
            ttts_domain_1.Models.Theater.find({}, 'name', (err, theaters) => {
                ttts_domain_1.Models.Screen.find({}, 'name theater', (err, screens) => {
                    let screensByTheater = {};
                    for (let screen of screens) {
                        if (!screensByTheater.hasOwnProperty(screen.get('theater'))) {
                            screensByTheater[screen.get('theater')] = [];
                        }
                        screensByTheater[screen.get('theater')].push(screen);
                    }
                    this.res.render('admission/performances', {
                        FilmUtil: ttts_domain_3.FilmUtil,
                        theaters: theaters,
                        screensByTheater: screensByTheater
                    });
                });
            });
        }
    }
    confirm() {
        ttts_domain_1.Models.Performance.findOne({ _id: this.req.params.id })
            .populate('film', 'name')
            .populate('screen', 'name')
            .populate('theater', 'name')
            .exec((err, performance) => {
            if (err)
                this.next(new Error('Message.UnexpectedError'));
            ttts_domain_1.Models.Reservation.find({
                performance: performance.get('_id'),
                status: ttts_domain_2.ReservationUtil.STATUS_RESERVED
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
