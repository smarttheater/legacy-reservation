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
const createDebug = require("debug");
const BaseController_1 = require("../../BaseController");
const debug = createDebug('chevre-frontend:controller:staffCancel');
/**
 * 内部関係者座席予約キャンセルコントローラー
 *
 * @export
 * @class StaffCancelController
 * @extends {BaseController}
 */
class StaffCancelController extends BaseController_1.default {
    execute() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.req.staffUser === undefined) {
                this.next(new Error(this.req.__('Message.UnexpectedError')));
                return;
            }
            const staffUser = this.req.staffUser;
            try {
                // 予約IDリストをjson形式で受け取る
                const reservationIds = JSON.parse(this.req.body.reservationIds);
                if (!Array.isArray(reservationIds)) {
                    throw new Error(this.req.__('Message.UnexpectedError'));
                }
                const promises = reservationIds.map((id) => __awaiter(this, void 0, void 0, function* () {
                    debug('updating to STATUS_KEPT_BY_CHEVRE by staff... staff:', staffUser.get('user_id'), 'signature:', staffUser.get('signature'), 'id:', id);
                    const reservation = yield chevre_domain_1.Models.Reservation.findOneAndUpdate({ _id: id }, { status: chevre_domain_2.ReservationUtil.STATUS_KEPT_BY_CHEVRE }, { new: true }).exec();
                    debug('updated to STATUS_KEPT_BY_CHEVRE by staff.', reservation, 'staff:', staffUser.get('user_id'), 'signature:', staffUser.get('signature'), 'id:', id);
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
exports.default = StaffCancelController;
