import BaseController from '../BaseController';
import Util from '../../../common/Util/Util';

import Models from '../../../common/models/Models';
import ReservationUtil from '../../../common/models/Reservation/ReservationUtil';
import FilmUtil from '../../../common/models/Film/FilmUtil';

import moment = require('moment');

export default class AdmissionController extends BaseController {
    public layout = 'layouts/admission/layout';

    public performances(): void {
        if (this.req.method === 'POST') {
            if (this.req.body.performanceId) {
                this.res.redirect(this.router.build('admission.confirm', {id: this.req.body.performanceId}));
            } else {
                this.res.redirect(this.router.build('admission.performances'));
            }
        } else {
            // 劇場とスクリーンを取得
            Models.Theater.find(
                {},
                'name',
                (err, theaters) => {
                    Models.Screen.find(
                        {},
                        'name theater',
                        (err, screens) => {
                            let screensByTheater = {};
                            for (let screen of screens) {
                                if (!screensByTheater.hasOwnProperty(screen.get('theater'))) {
                                    screensByTheater[screen.get('theater')] = [];
                                }

                                screensByTheater[screen.get('theater')].push(screen);
                            }

                            this.res.render('admission/performances', {
                                FilmUtil: FilmUtil,
                                theaters: theaters,
                                screensByTheater: screensByTheater
                            });
                        }
                    );
                }
            );
        }
    }

    public confirm(): void {
        Models.Performance.findById(this.req.params.id)
        .populate('film', 'name')
        .populate('screen', 'name')
        .populate('theater', 'name')
        .exec((err, performance) => {
            if (err) this.next(new Error('Message.UnexpectedError'));

            Models.Reservation.find(
                {
                    performance: performance.get('_id'),
                    status: ReservationUtil.STATUS_RESERVED
                },
                'status seat_code ticket_type_code ticket_type_name_ja ticket_type_name_en ticket_type_charge'
            )
            .exec((err, reservations) => {
                if (err) this.next(new Error('Message.UnexpectedError'));

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
