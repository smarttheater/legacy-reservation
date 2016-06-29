import BaseController from '../BaseController';
import Models from '../../../common/models/Models';
import ReservationUtil from '../../../common/models/Reservation/ReservationUtil';
import moment = require('moment');

export default class TaskController extends BaseController {
    public removeTemporaryReservation(): void {
        // 仮予約ステータスで、一定時間過ぎた予約を空席にする
        this.logger.info('updating temporary reservations...');
        Models.Reservation.update(
            {
                status: ReservationUtil.STATUS_TEMPORARY,
                updated_dt: {
                    $lt: moment().add('minutes', -10).toISOString(),
                },
            },
            {
                status: ReservationUtil.STATUS_AVAILABLE,
            },
            {
                multi: true,
            },
            (err) => {
                // 失敗しても、次のタスクにまかせる(気にしない)
                if (err) {
                } else {
                    this.res.send('success');
                }
            }
        );
    }

    public resetReservations(): void {
        Models.Reservation.remove(
            {
            },
        (err) => {
            this.logger.info('remove processed.', err);

            // 失敗しても、次のタスクにまかせる(気にしない)
            if (err) {
            } else {
                let promises = [];
                // パフォーマンスごとに空席予約を入れる
                Models.Performance.find(
                    {},
                    {},
                    {},
                    (err, performanceDocuments) => {
                        performanceDocuments.forEach((performanceDocument, index) => {
                            performanceDocument.get('seats').forEach((seatDocument, index) => {
                                promises.push(new Promise((resolve, reject) => {
                                    let reservationDocument = {
                                        performance: performanceDocument.get('_id'),
                                        performance_day: performanceDocument.get('_id'),
                                        performance_start_time: performanceDocument.get('_id'),
                                        performance_end_time: performanceDocument.get('_id'),
                                        seat_code: seatDocument.get('code'),
                                        status: ReservationUtil.STATUS_AVAILABLE
                                    };

                                    let reservation = new Models.Reservation(reservationDocument);

                                    this.logger.debug('saving reservation...');
                                    reservation.save((err) => {
                                        if (err) {
                                            reject(err);
                                        } else {
                                            resolve();
                                        }
                                    });

                                }));
                            });
                        });


                        Promise.all(promises).then(() => {
                            this.res.send('success');
                        }, (err) => {
                            this.res.send('false');
                        });

                    }
                );
            }
        });
    }}
