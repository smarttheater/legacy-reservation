"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const chevre_domain_1 = require("@motionpicture/chevre-domain");
const chevre_domain_2 = require("@motionpicture/chevre-domain");
const log4js = require("log4js");
const sponsorCancelForm_1 = require("../../../forms/sponsor/sponsorCancelForm");
const BaseController_1 = require("../../BaseController");
/**
 * 外部関係者座席予約キャンセルコントローラー
 *
 * @export
 * @class SponsorCancelController
 * @extends {BaseController}
 */
class SponsorCancelController extends BaseController_1.default {
    constructor() {
        super(...arguments);
        this.layout = 'layouts/sponsor/layout';
    }
    /**
     * チケットキャンセル
     * @method index
     * @returns {Promise<void>}
     */
    index() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.req.sponsorUser !== undefined && this.req.sponsorUser.isAuthenticated()) {
                // ログイン時そのまま
            }
            else {
                // this.req.setLocale('ja');
            }
            if (this.req.method === 'POST') {
                sponsorCancelForm_1.default(this.req);
                const validationResult = yield this.req.getValidationResult();
                if (!validationResult.isEmpty()) {
                    this.res.json({
                        success: false,
                        message: this.req.__('Message.invalidPaymentNoOrLast4DigitsOfTel')
                    });
                    return;
                }
                try {
                    // 予約を取得
                    const reservations = yield chevre_domain_1.Models.Reservation.find({
                        payment_no: this.req.body.paymentNo,
                        purchaser_tel: { $regex: `${this.req.body.last4DigitsOfTel}$` },
                        purchaser_group: chevre_domain_2.ReservationUtil.PURCHASER_GROUP_SPONSOR,
                        status: chevre_domain_2.ReservationUtil.STATUS_RESERVED
                    }).exec();
                    if (reservations.length === 0) {
                        this.res.json({
                            success: false,
                            message: this.req.__('Message.invalidPaymentNoOrLast4DigitsOfTel')
                        });
                        return;
                    }
                    const results = reservations.map((reservation) => {
                        return {
                            _id: reservation.get('_id'),
                            seat_code: reservation.get('seat_code'),
                            payment_no: reservation.get('payment_no'),
                            film_name_ja: reservation.get('film_name_ja'),
                            film_name_en: reservation.get('film_name_en'),
                            performance_start_str_ja: reservation.get('performance_start_str_ja'),
                            performance_start_str_en: reservation.get('performance_start_str_en'),
                            location_str_ja: reservation.get('location_str_ja'),
                            location_str_en: reservation.get('location_str_en')
                        };
                    });
                    this.res.json({
                        success: true,
                        message: null,
                        reservations: results
                    });
                    return;
                }
                catch (error) {
                    this.res.json({
                        success: false,
                        message: this.req.__('Message.UnexpectedError')
                    });
                    return;
                }
            }
            else {
                this.res.locals.paymentNo = '';
                this.res.locals.last4DigitsOfTel = '';
                this.res.render('sponsor/cancel');
                return;
            }
        });
    }
    /**
     * 購入番号からキャンセルする
     */
    executeByPaymentNo() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.req.sponsorUser === undefined) {
                this.next(new Error(this.req.__('Message.UnexpectedError')));
                return;
            }
            const sponsorUser = this.req.sponsorUser;
            this.logger = log4js.getLogger('cancel');
            try {
                // 予約IDリストをjson形式で受け取る
                const reservationIds = JSON.parse(this.req.body.reservationIds);
                if (!Array.isArray(reservationIds)) {
                    throw new Error(this.req.__('Message.UnexpectedError'));
                }
                const promises = reservationIds.map((id) => __awaiter(this, void 0, void 0, function* () {
                    this.logger.info('updating to STATUS_KEPT_BY_CHEVRE by sponsor... sponsor:', sponsorUser.get('user_id'), 'id:', id);
                    const reservation = yield chevre_domain_1.Models.Reservation.findOneAndUpdate({
                        _id: id,
                        payment_no: this.req.body.paymentNo,
                        purchaser_tel: { $regex: `${this.req.body.last4DigitsOfTel}$` },
                        purchaser_group: chevre_domain_2.ReservationUtil.PURCHASER_GROUP_SPONSOR,
                        status: chevre_domain_2.ReservationUtil.STATUS_RESERVED
                    }, { status: chevre_domain_2.ReservationUtil.STATUS_KEPT_BY_CHEVRE }, { new: true }).exec();
                    this.logger.info('updated to STATUS_KEPT_BY_CHEVRE.', reservation, 'sponsor:', sponsorUser.get('user_id'), 'id:', id);
                }));
                yield Promise.all(promises);
                this.res.json({
                    success: true,
                    message: null
                });
            }
            catch (error) {
                this.res.json({
                    success: false,
                    message: error.message
                });
            }
        });
    }
    execute() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.req.sponsorUser === undefined) {
                this.next(new Error(this.req.__('Message.UnexpectedError')));
                return;
            }
            const sponsorUser = this.req.sponsorUser;
            this.logger = log4js.getLogger('cancel');
            try {
                // 予約IDリストをjson形式で受け取る
                const reservationIds = JSON.parse(this.req.body.reservationIds);
                if (!Array.isArray(reservationIds)) {
                    throw new Error(this.req.__('Message.UnexpectedError'));
                }
                const promises = reservationIds.map((id) => __awaiter(this, void 0, void 0, function* () {
                    this.logger.info('updating to STATUS_KEPT_BY_CHEVRE by sponsor... sponsor:', sponsorUser.get('user_id'), 'id:', id);
                    const reservation = yield chevre_domain_1.Models.Reservation.findOneAndUpdate({ _id: id }, { status: chevre_domain_2.ReservationUtil.STATUS_KEPT_BY_CHEVRE }, { new: true }).exec();
                    this.logger.info('updated to STATUS_KEPT_BY_CHEVRE.', reservation, 'sponsor:', sponsorUser.get('user_id'), 'id:', id);
                }));
                yield Promise.all(promises);
                this.res.json({
                    success: true,
                    message: null
                });
            }
            catch (error) {
                this.res.json({
                    success: false,
                    message: error.message
                });
            }
        });
    }
}
exports.default = SponsorCancelController;
