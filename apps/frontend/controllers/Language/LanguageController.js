"use strict";
const BaseController_1 = require('../BaseController');
class LanguageController extends BaseController_1.default {
    /**
     * 言語切り替え
     */
    update() {
        let locale = this.req.params.locale;
        this.req.session['locale'] = locale;
        this.res.redirect(this.router.build('Home'));
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = LanguageController;
