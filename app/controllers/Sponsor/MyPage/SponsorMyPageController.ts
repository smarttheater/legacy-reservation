import {ReservationUtil} from '@motionpicture/ttts-domain';
import {ScreenUtil} from '@motionpicture/ttts-domain';
import {Models} from '@motionpicture/ttts-domain';
import Util from '../../../../common/Util/Util';
import BaseController from '../../BaseController';

export default class SponsorMyPageController extends BaseController {
    public layout = 'layouts/sponsor/layout';

    public index(): void {
        this.res.render('sponsor/mypage/index');
    }

    /**
     * マイページ予約検索
     */
    public search(): void {
        const limit: number = (this.req.query.limit) ? parseInt(this.req.query.limit) : 10;
        const page: number = (this.req.query.page) ? parseInt(this.req.query.page) : 1;
        const tel: string = (this.req.query.tel) ? this.req.query.tel : null;
        const purchaserName: string = (this.req.query.purchaser_name) ? this.req.query.purchaser_name : null;
        let paymentNo: string = (this.req.query.payment_no) ? this.req.query.payment_no : null;

        // 検索条件を作成
        const conditions: Object[] = [];

        conditions.push(
            {
                purchaser_group: ReservationUtil.PURCHASER_GROUP_SPONSOR,
                sponsor: this.req.sponsorUser.get('_id'),
                status: ReservationUtil.STATUS_RESERVED
            }
        );

        if (tel) {
            conditions.push({
                $or: [
                    {
                        purchaser_tel: {$regex: `${tel}`}
                    }
                ]
            });
        }

        if (purchaserName) {
            conditions.push({
                $or: [
                    {
                        purchaser_last_name: {$regex: `${purchaserName}`}
                    },
                    {
                        purchaser_first_name: {$regex: `${purchaserName}`}
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
}
