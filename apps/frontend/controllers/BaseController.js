"use strict";
const log4js = require("log4js");
const moment = require("moment");
const numeral = require("numeral");
const conf = require("config");
const Constants_1 = require("../../common/Util/Constants");
const Util_1 = require("../../common/Util/Util");
/**
 * ベースコントローラー
 *
 * 基本的にコントローラークラスはルーティングクラスより呼ばれる
 * あらゆるルーティングで実行されるメソッドは、このクラスがベースとなるので、メソッド共通の処理はここで実装するとよい
 */
class BaseController {
    constructor(req, res, next) {
        this.req = req;
        this.res = res;
        this.next = next;
        this.logger = log4js.getLogger('system');
        this.router = this.req.app.namedRoutes;
        this.res.locals.req = this.req;
        this.res.locals.moment = moment;
        this.res.locals.numeral = numeral;
        this.res.locals.conf = conf;
        this.res.locals.Constants = Constants_1.default;
        this.res.locals.Util = Util_1.default;
        // レイアウト指定があれば変更
        let _render = this.res.render;
        this.res.render = (view, options, cb) => {
            if (this.layout) {
                if (typeof options === 'undefined') {
                    options = {};
                }
                else if (typeof options === 'function') {
                    cb = options;
                    options = {};
                }
                if (!options.hasOwnProperty('layout')) {
                    options['layout'] = this.layout;
                }
            }
            _render(view, options, cb);
        };
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = BaseController;
