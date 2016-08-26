import ReserveBaseController from '../../ReserveBaseController';
import Models from '../../../../common/models/Models';
import PayDesignNotificationModel from '../../../models/Reserve/PayDesignNotificationModel';

export default class PayDesignReserveController extends ReserveBaseController {
    public test(): void {
        let jconv = require('jconv');
        this.res.setHeader('Content-Type', 'text/html; charset=Shift_JIS');
        this.res.render('paydesign/test', {
            layout: false
        }, (err, html) => {
            this.res.write( jconv.convert( html, 'UTF8', 'SJIS' ));
            this.res.end();
        });
    }

    /**
     * ペイデザイン入金通知
     */
    public notify(): void {
        this.logger.info('PayDesignReserveController notify start.', this.req);
        let payDesignNotificationModel = PayDesignNotificationModel.parse(this.req.body);
        let paymentNo = payDesignNotificationModel.FUKA;

        this.setProcessLogger(paymentNo, () => {
            this.logger.info('payDesignNotificationModel is ', payDesignNotificationModel);


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
                '_id total_charge',
                (err, reservations) => {
                    this.logger.info('reservations found.', err, reservations.length);
                    if (err) return this.res.send('1');
                    if (reservations.length === 0) return this.res.send('1');

                    // 利用金額の整合性
                    this.logger.info('Amount must be ', reservations[0].get('total_charge'));
                    if (parseInt(payDesignNotificationModel.KINGAKU) !== reservations[0].get('total_charge')) {
                        return this.res.send('1');
                    }


                    this.logger.info('processFixReservations processing... update:', update);
                    this.processFixReservations(paymentNo, update, (err) => {
                        this.logger.info('processFixReservations processed.', err);
                        if (err) {
                            // 失敗した場合、再通知されるので、それをリトライとみなす
                            this.logger.info('sending response 1...');
                            this.res.send('1');
                        } else {
                            this.logger.info('sending response 0...');
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
        this.logger.info('PayDesignReserveController cancel start.', this.req);
        let payDesignNotificationModel = PayDesignNotificationModel.parse(this.req.body);
        let paymentNo = payDesignNotificationModel.FUKA;

        this.setProcessLogger(paymentNo, () => {
            this.logger.info('payDesignNotificationModel is ', payDesignNotificationModel);
            this.res.send('0');
        });
    }
}
