"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chevre_domain_1 = require("@motionpicture/chevre-domain");
const conf = require("config");
const moment = require("moment");
const numeral = require("numeral");
const _ = require("underscore");
/**
 * ベースコントローラー
 *
 * 基本的にコントローラークラスはルーティングクラスより呼ばれる
 * あらゆるルーティングで実行されるメソッドは、このクラスがベースとなるので、メソッド共通の処理はここで実装するとよい
 *
 * @export
 * @class BaseController
 */
class BaseController {
    constructor(req, res, next) {
        this.req = req;
        this.res = res;
        this.next = next;
        this.res.locals.req = this.req;
        this.res.locals.moment = moment;
        this.res.locals.numeral = numeral;
        this.res.locals.conf = conf;
        this.res.locals.Util = chevre_domain_1.CommonUtil;
        this.res.locals.validation = null;
        // レイアウト指定があれば変更
        const render = this.res.render;
        this.res.render = (view, options, cb) => {
            if (!_.isEmpty(this.layout)) {
                if (options === undefined) {
                    options = {};
                }
                else if (typeof options === 'function') {
                    cb = options;
                    options = {};
                }
                if (options.layout === undefined) {
                    options.layout = this.layout;
                }
            }
            render(view, options, cb);
        };
    }
}
exports.default = BaseController;
