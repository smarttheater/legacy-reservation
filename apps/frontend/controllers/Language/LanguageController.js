"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var BaseController_1 = require('../BaseController');
var LanguageController = (function (_super) {
    __extends(LanguageController, _super);
    function LanguageController() {
        _super.apply(this, arguments);
    }
    /**
     * 言語切り替え
     */
    LanguageController.prototype.update = function () {
        var locale = this.req.params.locale;
        this.req.session['locale'] = locale;
        this.res.redirect(this.router.build('Home'));
    };
    return LanguageController;
}(BaseController_1.default));
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = LanguageController;
