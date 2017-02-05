"use strict";
const BaseController_1 = require("../BaseController");
class LanguageController extends BaseController_1.default {
    /**
     * 言語切り替え
     */
    update() {
        let locale = this.req.params.locale;
        this.req.session['locale'] = locale;
        let cb = (this.req.query.cb) ? this.req.query.cb : '/';
        this.res.redirect(cb);
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = LanguageController;
