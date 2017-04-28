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
const BaseController_1 = require("../../BaseController");
/**
 * 当日窓口座席予約キャンセルコントローラー
 *
 * @export
 * @class WindowCancelController
 * @extends {BaseController}
 */
class WindowCancelController extends BaseController_1.default {
    execute() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.req.windowUser === undefined) {
                this.next(new Error(this.req.__('Message.UnexpectedError')));
                return;
            }
            const userId = this.req.windowUser.get('user_id');
            try {
                // 予約IDリストをjson形式で受け取る
                const reservationIds = JSON.parse(this.req.body.reservationIds);
                if (!Array.isArray(reservationIds)) {
                    throw new Error(this.req.__('Message.UnexpectedError'));
                }
                console.log('removing reservation by window... window:', userId, 'reservationIds:', reservationIds);
                yield chevre_domain_1.Models.Reservation.remove({
                    _id: { $in: reservationIds },
                    purchaser_group: { $ne: chevre_domain_1.ReservationUtil.PURCHASER_GROUP_STAFF } // 念のため、内部は除外
                }).exec();
                console.log('reservation removed by window.', 'window:', userId, 'reservationIds:', reservationIds);
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
exports.default = WindowCancelController;
