"use strict";
const ReserveBaseController_1 = require('../../ReserveBaseController');
const PayDesignNotificationModel_1 = require('../../../models/Reserve/PayDesignNotificationModel');
class PayDesignReserveController extends ReserveBaseController_1.default {
    /**
     * ペイデザイン入金通知
     */
    notify() {
        this.logger.info('PayDesignReserveController notify start.', this.req);
        this.logger.info('PayDesignReserveController notify start.', this.req.method);
        this.logger.info('PayDesignReserveController notify start.', this.req.originalUrl);
        this.logger.info('PayDesignReserveController notify start.', this.req.query.text);
        this.logger.info('PayDesignReserveController notify start.', this.req.body);
        let gmoNotificationModel = PayDesignNotificationModel_1.default.parse(this.req.body);
        this.logger.info('gmoNotificationModel is', gmoNotificationModel);
        this.res.send('0');
    }
    /**
     * ペイデザイン取消通知
     */
    cancel() {
        this.logger.info('PayDesignReserveController notify start.', this.req);
        this.logger.info('PayDesignReserveController cancel start.', this.req.method);
        this.logger.info('PayDesignReserveController cancel start.', this.req.originalUrl);
        this.logger.info('PayDesignReserveController cancel start.', this.req.query);
        this.logger.info('PayDesignReserveController cancel start.', this.req.body);
        // let gmoNotificationModel = PayDesignNotificationModel.parse(this.req.body);
        // this.logger.info('gmoNotificationModel is', gmoNotificationModel);
        this.res.send('0');
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PayDesignReserveController;
