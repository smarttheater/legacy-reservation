"use strict";
/**
 * ベースコントローラー
 */
class BaseController {
    constructor(req, res, next) {
        this.req = req;
        this.res = res;
        this.next = next;
        this.router = this.req.app.namedRoutes;
        // URLパラメータで言語管理
        if (this.req.params.locale) {
            this.req.setLocale(req.params.locale);
        }
        let log4js = require('log4js');
        this.logger = log4js.getLogger('system');
        let moment = require('moment');
        this.res.locals.moment = moment;
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = BaseController;
