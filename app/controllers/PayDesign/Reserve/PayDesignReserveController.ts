import ReserveBaseController from '../../ReserveBaseController';
import {Models} from "@motionpicture/ttts-domain";
import PayDesignNotificationModel from '../../../models/Reserve/PayDesignNotificationModel';

export default class PayDesignReserveController extends ReserveBaseController {
    /**
     * ペイデザイン入金通知
     */
    public notify(): void {
        this.logger.info('PayDesignReserveController notify start. this.req.body:', this.req.body);
        let payDesignNotificationModel = PayDesignNotificationModel.parse(this.req.body);
        let paymentNo = payDesignNotificationModel.FUKA;
        if (!paymentNo) {
            this.res.send('1');
            return;
        }

        this.setProcessLogger(paymentNo, () => {
            this.logger.info('payDesignNotificationModel is', payDesignNotificationModel);

            let update = {
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
            Models.Reservation.find(
                {
                    payment_no: paymentNo
                },
                '_id',
                (err, reservations) => {
                    this.logger.info('reservations found.', err, reservations);
                    if (err) return this.res.send('1');
                    if (reservations.length === 0) return this.res.send('1');

                    this.logger.info('processFixReservations processing... update:', update);
                    this.processFixReservations(paymentNo, update, (err) => {
                        this.logger.info('processFixReservations processed.', err);
                        if (err) {
                            // 失敗した場合、再通知されるので、それをリトライとみなす
                            this.res.send('1');
                        } else {
                            this.res.send('0');
                        }
                    });
                }
            );
        });
    }

    /**
     * ペイデザイン取消通知
     */
    public cancel(): void {
        this.logger.info('PayDesignReserveController cancel start. this.req.body:', this.req.body);
        let payDesignNotificationModel = PayDesignNotificationModel.parse(this.req.body);
        let paymentNo = payDesignNotificationModel.FUKA;
        if (!paymentNo) {
            this.res.send('1');
            return;
        }

        this.setProcessLogger(paymentNo, () => {
            this.logger.info('payDesignNotificationModel is', payDesignNotificationModel);

            // 空席に戻す
            this.logger.info('finding reservations...payment_no:', paymentNo);
            Models.Reservation.find(
                {
                    payment_no: paymentNo
                },
                '_id',
                (err, reservations) => {
                    this.logger.info('reservations found.', err, reservations);
                    if (err) return this.res.send('1');
                    if (reservations.length === 0) return this.res.send('1');

                    this.logger.info('removing reservations...payment_no:', paymentNo);
                    let promises = reservations.map((reservation) => {
                        return new Promise((resolve, reject) => {
                            this.logger.info('removing reservation...', reservation.get('_id'));
                            reservation.remove((err) => {
                                this.logger.info('reservation removed.', reservation.get('_id'), err);
                                if (err) return reject(err);
                                resolve();
                            });
                        });
                    });
                    Promise.all(promises).then(() => {
                        this.res.send('0');
                    }, (err) => {
                        this.res.send('1');
                    });
                }
            );
        });
    }
}
