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
const PayDesignNotificationModel_1 = require("../../../models/Reserve/PayDesignNotificationModel");
const ReserveBaseController_1 = require("../../ReserveBaseController");
/**
 * ペイデザイン決済コントローラー
 *
 * @export
 * @class PayDesignReserveController
 * @extends {ReserveBaseController}
 */
class PayDesignReserveController extends ReserveBaseController_1.default {
    /**
     * ペイデザイン入金通知
     */
    notify() {
        return __awaiter(this, void 0, void 0, function* () {
            this.logger.info('PayDesignReserveController notify start. this.req.body:', this.req.body);
            const payDesignNotificationModel = PayDesignNotificationModel_1.default.parse(this.req.body);
            const paymentNo = payDesignNotificationModel.FUKA;
            if (paymentNo === undefined) {
                this.res.send('1');
                return;
            }
            this.setProcessLogger(paymentNo);
            this.logger.info('payDesignNotificationModel is', payDesignNotificationModel);
            const update = {
                paydesign_seq: payDesignNotificationModel.SEQ,
                paydesign_date: payDesignNotificationModel.DATE,
                paydesign_time: payDesignNotificationModel.TIME,
                paydesign_sid: payDesignNotificationModel.SID,
                paydesign_kingaku: payDesignNotificationModel.KINGAKU,
                paydesign_cvs: payDesignNotificationModel.CVS,
                paydesign_scode: payDesignNotificationModel.SCODE,
                paydesign_fuka: payDesignNotificationModel.FUKA
            };
            // 内容の整合性チェック
            try {
                this.logger.info('finding reservations...payment_no:', paymentNo);
                const reservations = yield chevre_domain_1.Models.Reservation.find({ payment_no: paymentNo }, '_id').exec();
                this.logger.info('reservations found.', reservations);
                this.logger.info('processFixReservations processing... update:', update);
                yield this.processFixReservations(paymentNo, update);
                this.logger.info('processFixReservations processed.');
                this.res.send('0');
            }
            catch (error) {
                // 失敗した場合、再通知されるので、それをリトライとみなす
                this.res.send('1');
            }
        });
    }
    /**
     * ペイデザイン取消通知
     */
    cancel() {
        return __awaiter(this, void 0, void 0, function* () {
            this.logger.info('PayDesignReserveController cancel start. this.req.body:', this.req.body);
            const payDesignNotificationModel = PayDesignNotificationModel_1.default.parse(this.req.body);
            const paymentNo = payDesignNotificationModel.FUKA;
            if (paymentNo === undefined) {
                this.res.send('1');
                return;
            }
            this.setProcessLogger(paymentNo);
            this.logger.info('payDesignNotificationModel is', payDesignNotificationModel);
            // 空席に戻す
            try {
                this.logger.info('finding reservations...payment_no:', paymentNo);
                const reservations = yield chevre_domain_1.Models.Reservation.find({ payment_no: paymentNo }, '_id').exec();
                this.logger.info('reservations found.', reservations);
                if (reservations.length === 0) {
                    throw new Error('reservations to cancel not found');
                }
                this.logger.info('removing reservations...payment_no:', paymentNo);
                const promises = reservations.map((reservation) => __awaiter(this, void 0, void 0, function* () {
                    this.logger.info('removing reservation...', reservation.get('_id'));
                    yield reservation.remove();
                    this.logger.info('reservation removed.', reservation.get('_id'));
                }));
                yield Promise.all(promises);
                this.res.send('0');
            }
            catch (error) {
                this.res.send('1');
            }
        });
    }
}
exports.default = PayDesignReserveController;
