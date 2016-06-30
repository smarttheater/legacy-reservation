import BaseController from '../../BaseController';
import StaffUser from '../../../models/User/StaffUser';
import Util from '../../../../common/Util/Util';
import ReservationUtil from '../../../../common/models/Reservation/ReservationUtil';
import Models from '../../../../common/models/Models';

export default class StaffMyPageController extends BaseController {
    public index(): void {
        this.res.render('staff/mypage/index', {
            layout: 'layouts/staff/layout',
        });
    }

    /**
     * マイページ予約検索API
     */
    public search(): void {
        let limit = 2;
        let page = (this.req.query.page) ? this.req.query.page : 1;
        let day = (this.req.query.day) ? this.req.query.day : null;
        let startTime = (this.req.query.start_time) ? this.req.query.start_time : null;
        let film = (this.req.query.film) ? this.req.query.film : null;
        let words = (this.req.query.words) ? this.req.query.words : null;

        // 検索条件を作成
        let conditions: Array<Object> = [];

        conditions.push({staff: this.staffUser.get('_id')});
        conditions.push({status: ReservationUtil.STATUS_RESERVED});

        if (film) {
            conditions.push({film: film});
        }
        if (day) {
            conditions.push({performance_day: day});
        }
        if (startTime) {
            conditions.push({
                performance_start_time: {
                    $gte: startTime,
                }
            });
        }
        if (words) {
            conditions.push({
                $or: [
                    {
                        film_name: {$regex: `${words}`}
                    },
                    {
                        staff_signature: {$regex: `${words}`}
                    },
                    {
                        watcher_name: {$regex: `${words}`}
                    }
                ]
            });
        }



        // 総数検索
        Models.Reservation.count(
            {
                $and: conditions
            },
            (err, count) => {

                Models.Reservation.find(
                    {
                        $and: conditions
                    },
                    {},
                    {
                        sort : {staff: 1, seat_code: 1}
                    }
                )
                .skip(limit * (page - 1))
                .limit(limit)
                .populate('staff screen')
                .exec((err, reservationDocuments) => {

                    if (err) {

                    } else {
                        conditions['page'] = page;

                        this.res.json({
                            isSuccess: true,
                            // conditions: conditions,
                            results: reservationDocuments,
                            count: count
                        });
                    }
                });
            }
        );
    }

    public updateWatcherName(): void {
        let reservationId = this.req.body.reservationId;
        let watcherName = this.req.body.watcherName;

        this.logger.debug('updating watcher_name... id:', reservationId);
        Models.Reservation.findOneAndUpdate(
            {
                staff: this.staffUser.get('_id'),
                status: ReservationUtil.STATUS_RESERVED,
                _id: reservationId,
            },
            {
                watcher_name: watcherName,
                staff_signature: this.staffUser.get('signature'),
            },
            {
                new: true
            },
            (err, reservationDocument) => {
                this.logger.debug('updated watcher_name. reservationDocument:', reservationDocument);

                if (err || reservationDocument === null) {

                    this.res.json({
                        isSuccess: false,
                        reservationId: null
                    });
                } else {

                    this.res.json({
                        isSuccess: true,
                        reservation: reservationDocument.toObject()
                    });
                }
            }
        );
    }
}
