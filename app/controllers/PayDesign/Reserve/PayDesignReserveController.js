"use strict";
const ttts_domain_1 = require("@motionpicture/ttts-domain");
const PayDesignNotificationModel_1 = require("../../../models/Reserve/PayDesignNotificationModel");
const ReserveBaseController_1 = require("../../ReserveBaseController");
class PayDesignReserveController extends ReserveBaseController_1.default {
    /**
     * ペイデザイン入金通知
     */
    notify() {
        this.logger.info('PayDesignReserveController notify start. this.req.body:', this.req.body);
        const payDesignNotificationModel = PayDesignNotificationModel_1.default.parse(this.req.body);
        const paymentNo = payDesignNotificationModel.FUKA;
        if (!paymentNo) {
            this.res.send('1');
            return;
        }
        this.setProcessLogger(paymentNo, () => {
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
            this.logger.info('finding reservations...payment_no:', paymentNo);
            ttts_domain_1.Models.Reservation.find({
                payment_no: paymentNo
            }, '_id', (err, reservations) => {
                this.logger.info('reservations found.', err, reservations);
                if (err)
                    return this.res.send('1');
                if (reservations.length === 0)
                    return this.res.send('1');
                this.logger.info('processFixReservations processing... update:', update);
                this.processFixReservations(paymentNo, update, (err) => {
                    this.logger.info('processFixReservations processed.', err);
                    if (err) {
                        // 失敗した場合、再通知されるので、それをリトライとみなす
                        this.res.send('1');
                    }
                    else {
                        this.res.send('0');
                    }
                });
            });
        });
    }
    /**
     * ペイデザイン取消通知
     */
    cancel() {
        this.logger.info('PayDesignReserveController cancel start. this.req.body:', this.req.body);
        const payDesignNotificationModel = PayDesignNotificationModel_1.default.parse(this.req.body);
        const paymentNo = payDesignNotificationModel.FUKA;
        if (!paymentNo) {
            this.res.send('1');
            return;
        }
        this.setProcessLogger(paymentNo, () => {
            this.logger.info('payDesignNotificationModel is', payDesignNotificationModel);
            // 空席に戻す
            this.logger.info('finding reservations...payment_no:', paymentNo);
            ttts_domain_1.Models.Reservation.find({
                payment_no: paymentNo
            }, '_id', (err, reservations) => {
                this.logger.info('reservations found.', err, reservations);
                if (err)
                    return this.res.send('1');
                if (reservations.length === 0)
                    return this.res.send('1');
                this.logger.info('removing reservations...payment_no:', paymentNo);
                const promises = reservations.map((reservation) => {
                    return new Promise((resolve, reject) => {
                        this.logger.info('removing reservation...', reservation.get('_id'));
                        reservation.remove((err) => {
                            this.logger.info('reservation removed.', reservation.get('_id'), err);
                            if (err)
                                return reject(err);
                            resolve();
                        });
                    });
                });
                Promise.all(promises).then(() => {
                    this.res.send('0');
                }, (err) => {
                    this.res.send('1');
                });
            });
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PayDesignReserveController;
