import BaseController from '../../BaseController';
import SponsorUser from '../../../models/User/SponsorUser';
import Util from '../../../../common/Util/Util';
import ReservationUtil from '../../../../common/models/Reservation/ReservationUtil';
import ScreenUtil from '../../../../common/models/Screen/ScreenUtil';
import Models from '../../../../common/models/Models';

export default class SponsorMyPageController extends BaseController {
    public layout = 'layouts/sponsor/layout';

    public index(): void {
        this.res.render('sponsor/mypage/index');
    }

    /**
     * マイページ予約検索
     */
    public search(): void {
        let limit = (this.req.query.limit) ? this.req.query.limit : 10;
        let page = (this.req.query.page) ? this.req.query.page : 1;
        let tel: string = (this.req.query.tel) ? this.req.query.tel : null;
        let purchaserName: string = (this.req.query.purchaser_name) ? this.req.query.purchaser_name : null;
        let paymentNo: string = (this.req.query.payment_no) ? this.req.query.payment_no : null;

        // 検索条件を作成
        let conditions: Array<Object> = [];

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
                .exec((err, reservations: Array<any>) => {
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
