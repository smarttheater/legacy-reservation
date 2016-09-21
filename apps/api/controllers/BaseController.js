"use strict";
const log4js = require('log4js');
const moment = require('moment');
/**
 * ベースコントローラー
 */
class BaseController {
    constructor(req, res, next) {
        this.req = req;
        this.res = res;
        this.next = next;
        this.logger = log4js.getLogger('system');
        this.router = this.req.app.namedRoutes;
        // URLパラメータで言語管理
        if (this.req.params.locale) {
            this.req.setLocale(req.params.locale);
        }
        this.res.locals.moment = moment;
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = BaseController;
