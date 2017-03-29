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
const chevre_domain_3 = require("@motionpicture/chevre-domain");
const _ = require("underscore");
const BaseController_1 = require("../BaseController");
/**
 * 入場コントローラー
 *
 * 上映当日入場画面から使う機能はここにあります。
 *
 * @class AdmissionController
 */
class AdmissionController extends BaseController_1.default {
    constructor() {
        super(...arguments);
        this.layout = 'layouts/admission/layout';
    }
    /**
     * 入場画面のパフォーマンス検索
     *
     * @memberOf AdmissionController
     */
    performances() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.req.method === 'POST') {
                if (!_.isEmpty(this.req.body.performanceId)) {
                    this.res.redirect(this.router.build('admission.confirm', { id: this.req.body.performanceId }));
                }
                else {
                    this.res.redirect(this.router.build('admission.performances'));
                }
            }
            else {
                try {
                    // 劇場とスクリーンを取得
                    const theaters = yield chevre_domain_1.Models.Theater.find({}, 'name').exec();
                    const screens = yield chevre_domain_1.Models.Screen.find({}, 'name theater').exec();
                    const screensByTheater = {};
                    screens.forEach((screen) => {
                        if (screensByTheater[screen.get('theater')] === undefined) {
                            screensByTheater[screen.get('theater')] = [];
                        }
                        screensByTheater[screen.get('theater')].push(screen);
                    });
                    this.res.render('admission/performances', {
                        FilmUtil: chevre_domain_3.FilmUtil,
                        theaters: theaters,
                        screensByTheater: screensByTheater
                    });
                }
                catch (error) {
                    this.next(error);
                }
            }
        });
    }
    /**
     * QRコード認証画面
     *
     * QRコードを読み取って結果を表示するための画面
     *
     * @memberOf AdmissionController
     */
    confirm() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const performance = yield chevre_domain_1.Models.Performance.findOne({ _id: this.req.params.id })
                    .populate('film', 'name')
                    .populate('screen', 'name')
                    .populate('theater', 'name')
                    .exec();
                const reservations = yield chevre_domain_1.Models.Reservation.find({
                    performance: performance.get('_id'),
                    status: chevre_domain_2.ReservationUtil.STATUS_RESERVED
                }, 'seat_code ticket_type_code ticket_type_name_ja ticket_type_name_en entered payment_no payment_seat_index').exec();
                const reservationsById = {};
                const reservationIdsByQrStr = {};
                reservations.forEach((reservation) => {
                    reservationsById[reservation.get('_id').toString()] = reservation;
                    reservationIdsByQrStr[reservation.get('qr_str')] = reservation.get('_id').toString();
                });
                this.res.render('admission/confirm', {
                    performance: performance,
                    reservationsById: reservationsById,
                    reservationIdsByQrStr: reservationIdsByQrStr
                });
            }
            catch (error) {
                this.next(new Error(this.req.__('Message.UnexpectedError')));
            }
        });
    }
}
exports.default = AdmissionController;
