import { Models } from '@motionpicture/chevre-domain';
import PayDesignNotificationModel from '../../../models/Reserve/PayDesignNotificationModel';
import ReserveBaseController from '../../ReserveBaseController';

/**
 * ペイデザイン決済コントローラー
 *
 * @export
 * @class PayDesignReserveController
 * @extends {ReserveBaseController}
 */
export default class PayDesignReserveController extends ReserveBaseController {
    /**
     * ペイデザイン入金通知
     */
    public notify(): void {
        this.logger.info('PayDesignReserveController notify start. this.req.body:', this.req.body);
        const payDesignNotificationModel = PayDesignNotificationModel.parse(this.req.body);
        const paymentNo = payDesignNotificationModel.FUKA;
        if (paymentNo === undefined) {
            this.res.send('1');
            return;
        }

        this.setProcessLogger(paymentNo, async () => {
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
                const reservations = await Models.Reservation.find(
                    { payment_no: paymentNo },
                    '_id'
                ).exec();
                this.logger.info('reservations found.', reservations);

                this.logger.info('processFixReservations processing... update:', update);
                await this.processFixReservations(paymentNo, update);
                this.logger.info('processFixReservations processed.');

                this.res.send('0');
            } catch (error) {
                // 失敗した場合、再通知されるので、それをリトライとみなす
                this.res.send('1');
            }
        });
    }

    /**
     * ペイデザイン取消通知
     */
    public cancel(): void {
        this.logger.info('PayDesignReserveController cancel start. this.req.body:', this.req.body);
        const payDesignNotificationModel = PayDesignNotificationModel.parse(this.req.body);
        const paymentNo = payDesignNotificationModel.FUKA;
        if (paymentNo === undefined) {
            this.res.send('1');
            return;
        }

        this.setProcessLogger(paymentNo, async () => {
            this.logger.info('payDesignNotificationModel is', payDesignNotificationModel);

            // 空席に戻す
            try {
                this.logger.info('finding reservations...payment_no:', paymentNo);
                const reservations = await Models.Reservation.find(
                    { payment_no: paymentNo },
                    '_id'
                ).exec();
                this.logger.info('reservations found.', reservations);

                if (reservations.length === 0) {
                    throw new Error('reservations to cancel not found');
                }

                this.logger.info('removing reservations...payment_no:', paymentNo);
                const promises = reservations.map(async (reservation) => {
                    this.logger.info('removing reservation...', reservation.get('_id'));
                    await reservation.remove();
                    this.logger.info('reservation removed.', reservation.get('_id'));
                });

                await Promise.all(promises);
                this.res.send('0');
            } catch (error) {
                this.res.send('1');
            }
        });
    }
}
