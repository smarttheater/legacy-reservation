import BaseController from '../../BaseController';
import SponsorUser from '../../../models/User/SponsorUser';
import Util from '../../../../common/Util/Util';
import ReservationUtil from '../../../../common/models/Reservation/ReservationUtil';
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
        let tel = (this.req.query.tel) ? this.req.query.tel : null;
        let purchaser_name = (this.req.query.purchaser_name) ? this.req.query.purchaser_name : null;

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

        if (purchaser_name) {
            conditions.push({
                $or: [
                    {
                        purchaser_last_name: {$regex: `${purchaser_name}`}
                    },
                    {
                        purchaser_first_name: {$regex: `${purchaser_name}`}
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
                if (err) {
                    return this.res.json({
                        success: false,
                        results: [],
                        count: 0
                    });
                }

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
                .exec((err, reservationDocuments) => {
                    if (err) {
                        this.res.json({
                            success: false,
                            results: [],
                            count: 0
                        });
                    } else {
                        conditions['page'] = page;

                        this.res.json({
                            success: true,
                            // conditions: conditions,
                            results: reservationDocuments,
                            count: count
                        });
                    }
                });
            }
        );
    }
}
