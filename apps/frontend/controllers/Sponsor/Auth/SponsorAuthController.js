"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var BaseController_1 = require('../../BaseController');
var SponsorUser_1 = require('../../../models/User/SponsorUser');
var sponsorLoginForm_1 = require('../../../forms/Sponsor/sponsorLoginForm');
var Models_1 = require('../../../../common/models/Models');
var SponsorAuthController = (function (_super) {
    __extends(SponsorAuthController, _super);
    function SponsorAuthController() {
        _super.apply(this, arguments);
    }
    /**
     * sponsor login
     * TODO パフォーマンス指定or無指定どちらか判断
     */
    SponsorAuthController.prototype.login = function () {
        var _this = this;
        if (this.sponsorUser.isAuthenticated()) {
            return this.res.redirect(this.router.build('sponsor.reserve.performances', {}));
        }
        if (this.req.method === 'POST') {
            var form = sponsorLoginForm_1.default(this.req);
            form(this.req, this.res, function (err) {
                if (_this.req.form.isValid) {
                    // ユーザー認証
                    _this.logger.debug('finding sponsor... user_id:', _this.req.form['userId']);
                    Models_1.default.Sponsor.findOne({
                        user_id: _this.req.form['userId'],
                        password: _this.req.form['password'],
                    }, function (err, sponsorDocument) {
                        if (err || sponsorDocument === null) {
                            _this.req.form.errors.push(_this.req.__('Message.invalid{{fieldName}}', { fieldName: _this.req.__('Form.FieldName.password') }));
                            _this.res.render('sponsor/auth/login', {
                                layout: 'layouts/sponsor/layout'
                            });
                        }
                        else {
                            // ログイン
                            _this.req.session[SponsorUser_1.default.AUTH_SESSION_NAME] = sponsorDocument.toObject();
                            // TODO リダイレクト先を指定できるようにする
                            _this.res.redirect(_this.router.build('sponsor.mypage', {}));
                        }
                    });
                }
                else {
                    _this.res.render('sponsor/auth/login', {
                        layout: 'layouts/sponsor/layout'
                    });
                }
            });
        }
        else {
            this.res.locals.userId = '';
            this.res.locals.password = '';
            this.res.render('sponsor/auth/login', {
                layout: 'layouts/sponsor/layout'
            });
        }
    };
    SponsorAuthController.prototype.logout = function () {
        delete this.req.session[SponsorUser_1.default.AUTH_SESSION_NAME];
        this.res.redirect('/');
    };
    return SponsorAuthController;
}(BaseController_1.default));
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SponsorAuthController;
