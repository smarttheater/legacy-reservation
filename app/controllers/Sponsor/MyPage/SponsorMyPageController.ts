import { ReservationUtil } from '@motionpicture/chevre-domain';
import { ScreenUtil } from '@motionpicture/chevre-domain';
import { Models } from '@motionpicture/chevre-domain';
import * as Util from '../../../../common/Util/Util';
import BaseController from '../../BaseController';

const DEFAULT_RADIX = 10;

/**
 * 外部関係者舞マイページコントトーラー
 *
 * @export
 * @class SponsorMyPageController
 * @extends {BaseController}
 */
export default class SponsorMyPageController extends BaseController {
    public layout: string = 'layouts/sponsor/layout';

    public index(): void {
        this.res.render('sponsor/mypage/index');
    }

    /**
     * マイページ予約検索
     */
    public async search(): Promise<void> {
        if (this.req.sponsorUser === undefined) {
            this.next(new Error(this.req.__('Message.UnexpectedError')));
            return;
        }

        // tslint:disable-next-line:no-magic-numbers
        const limit: number = (this.req.query.limit !== undefined && this.req.query.limit !== '') ? parseInt(this.req.query.limit, DEFAULT_RADIX) : 10;
        const page: number = (this.req.query.page !== undefined && this.req.query.page !== '') ? parseInt(this.req.query.page, DEFAULT_RADIX) : 1;
        const tel: string | null = (this.req.query.tel !== undefined && this.req.query.tel !== '') ? this.req.query.tel : null;
        const purchaserName: string | null = (this.req.query.purchaser_name !== undefined && this.req.query.purchaser_name !== '') ? this.req.query.purchaser_name : null;
        let paymentNo: string | null = (this.req.query.payment_no !== undefined && this.req.query.payment_no !== '') ? this.req.query.payment_no : null;

        // 検索条件を作成
        const conditions: any[] = [];

        conditions.push(
            {
                purchaser_group: ReservationUtil.PURCHASER_GROUP_SPONSOR,
                sponsor: this.req.sponsorUser.get('_id'),
                status: ReservationUtil.STATUS_RESERVED
            }
        );

        if (tel !== null) {
            conditions.push({
                $or: [
                    {
                        purchaser_tel: { $regex: `${tel}` }
                    }
                ]
            });
        }

        if (purchaserName !== null) {
            conditions.push({
                $or: [
                    {
                        purchaser_last_name: { $regex: `${purchaserName}` }
                    },
                    {
                        purchaser_first_name: { $regex: `${purchaserName}` }
                    }
                ]
            });
        }

        if (paymentNo !== null) {
            // remove space characters
            paymentNo = Util.toHalfWidth(paymentNo.replace(/\s/g, ''));
            conditions.push({ payment_no: { $regex: `${paymentNo}` } });
        }

        try {
            // 総数検索
            const count = await Models.Reservation.count(
                {
                    $and: conditions
                }
            ).exec();

            const reservations = <any[]>await Models.Reservation.find({ $and: conditions })
                .skip(limit * (page - 1))
                .limit(limit)
                .lean(true)
                .exec();

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
        } catch (error) {
            console.error(error);
            this.res.json({
                success: false,
                results: [],
                count: 0
            });
        }
    }
}
