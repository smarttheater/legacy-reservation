import ReserveBaseController from '../../ReserveBaseController';
import Util from '../../../../common/Util/Util';

import Models from '../../../../common/models/Models';
import ReservationUtil from '../../../../common/models/Reservation/ReservationUtil';

import ReservationModel from '../../../models/Reserve/ReservationModel';
import PayDesignNotificationModel from '../../../models/Reserve/PayDesignNotificationModel';

export default class PayDesignReserveController extends ReserveBaseController {
    /**
     * ペイデザイン入金通知
     */
    public notify(): void {
        this.logger.info('PayDesignReserveController notify start.', this.req.method);
        this.logger.info('PayDesignReserveController notify start.', this.req.originalUrl);
        this.logger.info('PayDesignReserveController notify start.', this.req.query);
        this.logger.info('PayDesignReserveController notify start.', this.req.body);
        let gmoNotificationModel = PayDesignNotificationModel.parse(this.req.body);
        this.logger.info('gmoNotificationModel is', gmoNotificationModel);

        this.res.send('0');
    }

    /**
     * ペイデザイン取消通知
     */
    public cancel(): void {
        this.logger.info('PayDesignReserveController cancel start.', this.req.method);
        this.logger.info('PayDesignReserveController cancel start.', this.req.originalUrl);
        this.logger.info('PayDesignReserveController cancel start.', this.req.query);
        this.logger.info('PayDesignReserveController cancel start.', this.req.body);
        // let gmoNotificationModel = PayDesignNotificationModel.parse(this.req.body);
        // this.logger.info('gmoNotificationModel is', gmoNotificationModel);

        this.res.send('0');
    }
}
