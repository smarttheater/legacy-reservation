"use strict";
var log4js = require('log4js');
var moment = require('moment');
var util = require('util');
/**
 * ベースコントローラー
 *
 * 基本的にコントローラークラスはルーティングクラスより呼ばれる
 * あらゆるルーティングで実行されるメソッドは、このクラスがベースとなるので、メソッド共通の処理はここで実装するとよい
 */
var BaseController = (function () {
    function BaseController(req, res, next) {
        this.req = req;
        this.res = res;
        this.next = next;
        this.logger = log4js.getLogger('system');
        this.router = this.req.app.namedRoutes;
        // URLパラメータで言語管理
        if (this.req.params.locale) {
            this.req.setLocale(req.params.locale);
        }
        this.res.locals.req = this.req;
        this.res.locals.moment = moment;
        this.res.locals.util = util;
    }
    return BaseController;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = BaseController;
