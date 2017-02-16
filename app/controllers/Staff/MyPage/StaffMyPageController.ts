import {ReservationUtil} from '@motionpicture/ttts-domain';
import {ScreenUtil} from '@motionpicture/ttts-domain';
import {Models} from '@motionpicture/ttts-domain';
import Util from '../../../../common/Util/Util';
import BaseController from '../../BaseController';

export default class StaffMyPageController extends BaseController {
    public layout = 'layouts/staff/layout';

    public index(): void {
        Models.Theater.find({}, 'name', {sort: {_id: 1}}, (err, theaters) => {
            Models.Film.find({}, 'name', {sort: {_id: 1}}, (err, films) => {
                this.res.render('staff/mypage/index', {
                    theaters: theaters,
                    films: films
                });
            });
        });
    }

    /**
     * マイページ予約検索
     */
    public search(): void {
        const limit: number = (this.req.query.limit) ? parseInt(this.req.query.limit) : 10;
        const page: number = (this.req.query.page) ? parseInt(this.req.query.page) : 1;
        const day: string = (this.req.query.day) ? this.req.query.day : null;
        const startTime: string = (this.req.query.start_time) ? this.req.query.start_time : null;
        const theater: string = (this.req.query.theater) ? this.req.query.theater : null;
        const film: string = (this.req.query.film) ? this.req.query.film : null;
        const updater: string = (this.req.query.updater) ? this.req.query.updater : null;
        let paymentNo: string = (this.req.query.payment_no) ? this.req.query.payment_no : null;

        // 検索条件を作成
        const conditions: Object[] = [];

        // 管理者の場合、内部関係者の予約全て&確保中
        if (this.req.staffUser.get('is_admin')) {
            conditions.push(
                {
                    $or: [
                        {
                            purchaser_group: ReservationUtil.PURCHASER_GROUP_STAFF,
                            status: ReservationUtil.STATUS_RESERVED
                        },
                        {
                            status: ReservationUtil.STATUS_KEPT_BY_TTTS
                        }
                    ]
                }
            );
        } else {
            conditions.push(
                {
                    purchaser_group: ReservationUtil.PURCHASER_GROUP_STAFF,
                    staff: this.req.staffUser.get('_id'),
                    status: ReservationUtil.STATUS_RESERVED
                }
            );
        }

        if (film) {
            conditions.push({film: film});
        }

        if (theater) {
            conditions.push({theater: theater});
        }

        if (day) {
            conditions.push({performance_day: day});
        }

        if (startTime) {
            conditions.push({
                performance_start_time: {
                    $gte: startTime
                }
            });
        }

        if (updater) {
            conditions.push({
                $or: [
                    {
                        staff_signature: {$regex: `${updater}`}
                    },
                    {
                        watcher_name: {$regex: `${updater}`}
                    }
                ]
            });
        }

        if (paymentNo) {
            // remove space characters
            paymentNo = Util.toHalfWidth(paymentNo.replace(/\s/g, ''));
            conditions.push({payment_no: {$regex: `${paymentNo}`}});
        }



        // 総数検索
        Models.Reservation.count(
            {
                $and: conditions
            },
            (err, count) => {
                if (err) {
                    return this.res.json({
                        success: false,
                        results: [],
                        count: 0
                    });
                }

                Models.Reservation.find({$and: conditions})
                .skip(limit * (page - 1))
                .limit(limit)
                .lean(true)
                .exec((err, reservations: any[]) => {
                    if (err) {
                        this.res.json({
                            success: false,
                            results: [],
                            count: 0
                        });
                    } else {
                        // ソート昇順(上映日→開始時刻→スクリーン→座席コード)
                        reservations.sort((a, b) => {
                            if (a.performance_day > b.performance_day) return 1;
                            if (a.performance_start_time > b.performance_start_time) return 1;
                            if (a.screen > b.screen) return 1;
                            return ScreenUtil.sortBySeatCode(a.seat_code, b.seat_code);
                        });

                        this.res.json({
                            success: true,
                            results: reservations,
                            count: count
                        });
                    }
                });
            }
        );
    }

    /**
     * 配布先を更新する
     */
    public updateWatcherName(): void {
        const reservationId = this.req.body.reservationId;
        const watcherName = this.req.body.watcherName;

        const condition = {
            _id: reservationId,
            status: ReservationUtil.STATUS_RESERVED
        };
        // 管理者でない場合は自分の予約のみ
        if (!this.req.staffUser.get('is_admin')) {
            condition['staff'] = this.req.staffUser.get('_id');
        }
        Models.Reservation.findOneAndUpdate(
            condition,
            {
                watcher_name: watcherName,
                watcher_name_updated_at: Date.now(),
                staff_signature: this.req.staffUser.get('signature')
            },
            {
                new: true
            },
            (err, reservation) => {
                if (err) {
                    return this.res.json({
                        success: false,
                        message: this.req.__('Message.UnexpectedError'),
                        reservationId: null
                    });
                }

                if (!reservation) {
                    return this.res.json({
                        success: false,
                        message: this.req.__('Message.NotFound'),
                        reservationId: null
                    });
                }

                this.res.json({
                    success: true,
                    reservation: reservation.toObject()
                });
            }
        );
    }

    /**
     * 座席開放
     */
    public release(): void {
        if (this.req.method === 'POST') {
            const day = this.req.body.day;
            if (!day) {
                this.res.json({
                    success: false,
                    message: this.req.__('Message.UnexpectedError')
                });

                return;
            }

            Models.Reservation.remove(
                {
                    performance_day: day,
                    status: ReservationUtil.STATUS_KEPT_BY_TTTS
                },
                (err) => {
                    if (err) {
                        this.res.json({
                            success: false,
                            message: this.req.__('Message.UnexpectedError')
                        });
                    } else {
                        this.res.json({
                            success: true,
                            message: null
                        });
                    }
                }
            );
        } else {
            // 開放座席情報取得
            Models.Reservation.find(
                {
                    status: ReservationUtil.STATUS_KEPT_BY_TTTS
                },
                'status seat_code performance_day',
                (err, reservations) => {
                    if (err) return this.next(new Error(this.req.__('Message.UnexpectedError')));

                    // 日付ごとに
                    const reservationsByDay = {};
                    for (const reservation of reservations) {
                        if (!reservationsByDay.hasOwnProperty(reservation.get('performance_day'))) {
                            reservationsByDay[reservation.get('performance_day')] = [];
                        }

                        reservationsByDay[reservation.get('performance_day')].push(reservation);
                    }

                    this.res.render('staff/mypage/release', {
                        reservationsByDay: reservationsByDay
                    });
                }
            );
        }
    }
}
