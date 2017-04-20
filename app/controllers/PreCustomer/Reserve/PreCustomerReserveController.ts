import { Models } from '@motionpicture/chevre-domain';
import { ScreenUtil } from '@motionpicture/chevre-domain';
import { FilmUtil } from '@motionpicture/chevre-domain';
import { ReservationUtil } from '@motionpicture/chevre-domain';
import * as conf from 'config';
import * as httpStatus from 'http-status';
import * as lockFile from 'lockfile';
import * as moment from 'moment';
import * as _ from 'underscore';

import * as GMOUtil from '../../../../common/Util/GMO/GMOUtil';
import reservePerformanceForm from '../../../forms/reserve/reservePerformanceForm';
import reserveSeatForm from '../../../forms/reserve/reserveSeatForm';
import ReservationModel from '../../../models/Reserve/ReservationModel';
import ReserveBaseController from '../../ReserveBaseController';
import ReserveControllerInterface from '../../ReserveControllerInterface';

const DEFAULT_RADIX = 10;

/**
 * 先行予約コントローラー
 *
 * @export
 * @class PreCustomerReserveController
 * @extends {ReserveBaseController}
 * @implements {ReserveControllerInterface}
 */
export default class PreCustomerReserveController extends ReserveBaseController implements ReserveControllerInterface {
    public purchaserGroup: string = ReservationUtil.PURCHASER_GROUP_CUSTOMER;
    public layou: string = 'layouts/preCustomer/layout';

    public async start(): Promise<void> {
        // MPのIPは許可
        // tslint:disable-next-line:no-empty
        if (this.req.headers['x-forwarded-for'] !== undefined && /^124\.155\.113\.9$/.test(this.req.headers['x-forwarded-for'])) {
        } else {
            // 期限指定
            const now = moment();
            const dateStartPreCustomerReservation = moment(conf.get<string>('datetimes.reservation_start_pre_customers'));
            const dateEndPreCustomerReservation = moment(conf.get<string>('datetimes.reservation_end_pre_customers'));
            if (now < dateStartPreCustomerReservation || dateEndPreCustomerReservation < now) {
                this.res.render('preCustomer/reserve/outOfTerm', { layout: false });
                return;
            }
        }

        try {
            const reservationModel = await this.processStart();
            await reservationModel.save();

            if (reservationModel.performance !== undefined) {
                // パフォーマンス指定で遷移してきたら座席選択へ
                this.res.redirect(`/pre/reserve/${reservationModel.token}/seats`);
            } else {
                // パフォーマンス指定なければパフォーマンス選択へ
                this.res.redirect(`/pre/reserve/${reservationModel.token}/performances`);
            }
        } catch (error) {
            this.next(new Error(this.req.__('Message.UnexpectedError')));
        }
    }

    /**
     * 規約
     */
    public terms(): void {
        this.next(new Error('Message.NotFound'));
    }

    /**
     * スケジュール選択
     * @returns {Promise<void>}
     */
    public async performances(): Promise<void> {
        if (this.req.preCustomerUser === undefined) {
            this.next(new Error(this.req.__('Message.UnexpectedError')));
            return;
        }

        try {
            const preCustomerUser = this.req.preCustomerUser;
            const token = this.req.params.token;
            let reservationModel = await ReservationModel.find(token);

            if (reservationModel === null) {
                this.next(new Error(this.req.__('Message.Expired')));
                return;
            }

            // 仮予約あればキャンセルする
            // tslint:disable-next-line:no-shadowed-variable
            try {
                reservationModel = await this.processCancelSeats(reservationModel);
                await reservationModel.save();

                // 1.5次販売アカウントによる予約数を取得
                // 決済中ステータスは含めない
                const reservationsCount = await Models.Reservation.count(
                    {
                        $and: [
                            { pre_customer: preCustomerUser.get('_id') },
                            {
                                $or: [
                                    { status: { $in: [ReservationUtil.STATUS_TEMPORARY, ReservationUtil.STATUS_RESERVED] } },
                                    {
                                        status: ReservationUtil.STATUS_WAITING_SETTLEMENT, // コンビニ決済で入金待ちのもの
                                        gmo_payment_term: { $exists: true }
                                    }
                                ]
                            }
                        ]
                    }
                ).exec();

                const reservableCount = parseInt(preCustomerUser.get('max_reservation_count'), DEFAULT_RADIX) - reservationsCount;

                if (reservableCount <= 0) {
                    this.next(new Error(this.req.__('Message.NoMoreReservation')));
                    return;
                }

                if (this.req.method === 'POST') {
                    reservePerformanceForm(this.req);
                    const validationResult = await this.req.getValidationResult();
                    if (!validationResult.isEmpty()) {
                        this.next(new Error(this.req.__('Message.UnexpectedError')));
                        return;
                    }

                    // パフォーマンスFIX
                    try {
                        reservationModel = await this.processFixPerformance(
                            <ReservationModel>reservationModel,
                            this.req.body.performanceId
                        );
                        await reservationModel.save();
                        this.res.redirect(`/pre/reserve/${token}/seats`);
                    } catch (error) {
                        this.next(new Error(this.req.__('Message.UnexpectedError')));
                    }
                } else {
                    this.res.render('preCustomer/reserve/performances', {
                        FilmUtil: FilmUtil,
                        reservableCount: reservableCount
                    });
                }
            } catch (error) {
                this.next(error);
            }
        } catch (error) {
            this.next(new Error(this.req.__('Message.UnexpectedError')));
        }
    }

    /**
     * 座席選択
     * @method seats
     * @return {Promise<void>}
     */
    // tslint:disable-next-line:max-func-body-length
    public async seats(): Promise<void> {
        if (this.req.preCustomerUser === undefined) {
            this.next(new Error(this.req.__('Message.UnexpectedError')));
            return;
        }

        try {
            const preCustomerUser = this.req.preCustomerUser;
            const token = this.req.params.token;
            let reservationModel = await ReservationModel.find(token);

            if (reservationModel === null) {
                this.next(new Error(this.req.__('Message.Expired')));
                return;
            }

            // 1.5次販売アカウントによる予約数を取得
            // 決済中ステータスは含めない
            const lockPath = `${__dirname}/../../../../lock/PreCustomerFixSeats${preCustomerUser.get('_id')}.lock`;
            lockFile.lockSync(lockPath, {});

            const reservationsCount = await Models.Reservation.count(
                {
                    $and: [
                        { pre_customer: preCustomerUser.get('_id') },
                        {
                            $or: [
                                { status: { $in: [ReservationUtil.STATUS_TEMPORARY, ReservationUtil.STATUS_RESERVED] } },
                                {
                                    status: ReservationUtil.STATUS_WAITING_SETTLEMENT, // コンビニ決済で入金待ちのもの
                                    gmo_payment_term: { $exists: true }
                                }
                            ]
                        },
                        {
                            $or: [
                                { performance: { $ne: (<ReservationModel>reservationModel).performance._id } }, // パフォーマンスの違うもの
                                { // 現在のフロー中の予約は除く
                                    performance: (<ReservationModel>reservationModel).performance._id,
                                    seat_code: { $nin: (<ReservationModel>reservationModel).seatCodes }
                                }
                            ]
                        }
                    ]
                }
            ).exec();

            // 一度に確保できる座席数は、残り可能枚数と、10の小さい方
            const reservableCount = parseInt(preCustomerUser.get('max_reservation_count'), DEFAULT_RADIX) - reservationsCount;
            const limit = Math.min((<ReservationModel>reservationModel).getSeatsLimit(), reservableCount);

            // すでに枚数制限に達している場合
            if (limit <= 0) {
                lockFile.unlockSync(lockPath);
                this.next(new Error(this.req.__('Message.seatsLimit{{limit}}', { limit: limit.toString() })));
                return;
            }

            if (this.req.method === 'POST') {
                reserveSeatForm(this.req);
                const validationResult = await this.req.getValidationResult();
                if (!validationResult.isEmpty()) {
                    lockFile.unlock(lockPath, () => {
                        this.res.redirect(`/pre/reserve/${token}/seats`);
                        return;
                    });
                }
                const seatCodes: string[] = JSON.parse(this.req.body.seatCodes);

                // 追加指定席を合わせて制限枚数を超過した場合
                if (seatCodes.length > limit) {
                    lockFile.unlockSync(lockPath);
                    const message = this.req.__('Message.seatsLimit{{limit}}', { limit: limit.toString() });
                    this.res.redirect(`/pre/reserve/${token}/seats?message=${encodeURIComponent(message)}`);
                    return;
                }

                // 仮予約あればキャンセルする
                try {
                    reservationModel = await this.processCancelSeats(<ReservationModel>reservationModel);
                } catch (error) {
                    this.next(error);
                    return;
                }

                // 座席FIX
                try {
                    reservationModel = await this.processFixSeats(reservationModel, seatCodes);
                    lockFile.unlockSync(lockPath);
                    await reservationModel.save();
                    // 券種選択へ
                    this.res.redirect(`/pre/reserve/${token}/tickets`);
                    return;
                } catch (error) {
                    await reservationModel.save();
                    const message = this.req.__('Message.SelectedSeatsUnavailable');
                    this.res.redirect(`/pre/reserve/${token}/seats?message=${encodeURIComponent(message)}`);
                    return;
                }
            } else {
                lockFile.unlockSync(lockPath);
                this.res.render('preCustomer/reserve/seats', {
                    reservationModel: reservationModel,
                    limit: limit,
                    reservableCount: reservableCount
                });
            }
        } catch (error) {
            this.next(new Error(this.req.__('Message.UnexpectedError')));
        }
    }

    /**
     * 券種選択
     */
    public async tickets(): Promise<void> {
        try {
            const token = this.req.params.token;
            let reservationModel = await ReservationModel.find(token);

            if (reservationModel === null) {
                this.next(new Error(this.req.__('Message.Expired')));
                return;
            }

            reservationModel.paymentMethod = '';

            if (this.req.method === 'POST') {
                try {
                    reservationModel = await this.processFixTickets(reservationModel);
                    await reservationModel.save();
                    this.res.redirect(`/pre/reserve/${token}/profile`);
                } catch (error) {
                    this.res.redirect(`/pre/reserve/${token}/tickets`);
                }
            } else {
                this.res.render('preCustomer/reserve/tickets', {
                    reservationModel: reservationModel
                });
            }
        } catch (error) {
            this.next(new Error(this.req.__('Message.UnexpectedError')));
        }
    }

    /**
     * 購入者情報
     */
    public async profile(): Promise<void> {
        try {
            const token = this.req.params.token;
            let reservationModel = await ReservationModel.find(token);

            if (reservationModel === null) {
                this.next(new Error(this.req.__('Message.Expired')));
                return;
            }

            if (this.req.method === 'POST') {
                try {
                    reservationModel = await this.processFixProfile(reservationModel);
                    await reservationModel.save();
                    this.res.redirect(`/pre/reserve/${token}/confirm`);
                } catch (error) {
                    this.res.render('preCustomer/reserve/profile', {
                        reservationModel: reservationModel
                    });
                }
            } else {
                // セッションに情報があれば、フォーム初期値設定
                const email = reservationModel.purchaserEmail;
                this.res.locals.lastName = reservationModel.purchaserLastName;
                this.res.locals.firstName = reservationModel.purchaserFirstName;
                this.res.locals.tel = reservationModel.purchaserTel;
                this.res.locals.age = reservationModel.purchaserAge;
                this.res.locals.address = reservationModel.purchaserAddress;
                this.res.locals.gender = reservationModel.purchaserGender;
                this.res.locals.email = (!_.isEmpty(email)) ? email : '';
                this.res.locals.emailConfirm = (!_.isEmpty(email)) ? email.substr(0, email.indexOf('@')) : '';
                this.res.locals.emailConfirmDomain = (!_.isEmpty(email)) ? email.substr(email.indexOf('@') + 1) : '';
                this.res.locals.paymentMethod =
                    (!_.isEmpty(reservationModel.paymentMethod)) ? reservationModel.paymentMethod : GMOUtil.PAY_TYPE_CREDIT;

                this.res.render('preCustomer/reserve/profile', {
                    reservationModel: reservationModel
                });
            }
        } catch (error) {
            this.next(new Error(this.req.__('Message.UnexpectedError')));
        }
    }

    /**
     * 予約内容確認
     */
    public async confirm(): Promise<void> {
        try {
            const token = this.req.params.token;
            let reservationModel = await ReservationModel.find(token);

            if (reservationModel === null) {
                this.next(new Error(this.req.__('Message.Expired')));
                return;
            }

            if (this.req.method === 'POST') {
                try {
                    reservationModel = await this.processConfirm(reservationModel);
                    await reservationModel.save();
                    this.logger.info('starting GMO payment...');
                    this.res.redirect((<any>httpStatus).PERMANENT_REDIRECT, `/GMO/reserve/${token}/start?locale=${this.req.getLocale()}`);
                } catch (error) {
                    await reservationModel.remove();
                    this.next(error);
                }
            } else {
                this.res.render('preCustomer/reserve/confirm', {
                    reservationModel: reservationModel
                });
            }
        } catch (error) {
            this.next(new Error(this.req.__('Message.UnexpectedError')));
        }
    }

    /**
     * 仮予約完了
     */
    public async waitingSettlement(): Promise<void> {
        try {
            const paymentNo = this.req.params.paymentNo;
            const reservations = await Models.Reservation.find(
                {
                    payment_no: paymentNo,
                    purchaser_group: this.purchaserGroup,
                    status: ReservationUtil.STATUS_WAITING_SETTLEMENT,
                    purchased_at: { // 購入確定から30分有効
                        $gt: moment().add(-30, 'minutes').toISOString() // tslint:disable-line:no-magic-numbers
                    }
                }
            ).exec();

            if (reservations.length === 0) {
                this.next(new Error(this.req.__('Message.NotFound')));
                return;
            }

            reservations.sort((a, b) => {
                return ScreenUtil.sortBySeatCode(a.get('seat_code'), b.get('seat_code'));
            });

            this.res.render('preCustomer/reserve/waitingSettlement', {
                reservationDocuments: reservations
            });
        } catch (error) {
            this.next(new Error(this.req.__('Message.UnexpectedError')));
        }
    }

    /**
     * 予約完了
     */
    public async complete(): Promise<void> {
        try {
            const paymentNo = this.req.params.paymentNo;
            const reservations = await Models.Reservation.find(
                {
                    payment_no: paymentNo,
                    status: ReservationUtil.STATUS_RESERVED,
                    purchased_at: { // 購入確定から30分有効
                        $gt: moment().add(-30, 'minutes').toISOString() // tslint:disable-line:no-magic-numbers
                    }
                }
            ).exec();

            if (reservations.length === 0) {
                this.next(new Error(this.req.__('Message.NotFound')));
                return;
            }

            reservations.sort((a, b) => {
                return ScreenUtil.sortBySeatCode(a.get('seat_code'), b.get('seat_code'));
            });

            this.res.render('preCustomer/reserve/complete', {
                reservationDocuments: reservations
            });
        } catch (error) {
            this.next(new Error(this.req.__('Message.UnexpectedError')));
        }
    }
}
