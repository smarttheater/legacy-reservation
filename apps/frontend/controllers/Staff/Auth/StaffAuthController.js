"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var BaseController_1 = require('../../BaseController');
var StaffUser_1 = require('../../../models/User/StaffUser');
var staffLoginForm_1 = require('../../../forms/Staff/staffLoginForm');
var Models_1 = require('../../../../common/models/Models');
var StaffAuthController = (function (_super) {
    __extends(StaffAuthController, _super);
    function StaffAuthController() {
        _super.apply(this, arguments);
    }
    StaffAuthController.prototype.login = function () {
        var _this = this;
        if (this.staffUser.isAuthenticated()) {
            return this.res.redirect(this.router.build('staff.reserve.performances', {}));
        }
        if (this.req.method === 'POST') {
            var form = staffLoginForm_1.default(this.req);
            form(this.req, this.res, function (err) {
                if (_this.req.form.isValid) {
                    // ユーザー認証
                    _this.logger.debug('finding staff... user_id:', _this.req.form['userId']);
                    Models_1.default.Staff.findOne({
                        user_id: _this.req.form['userId'],
                        password: _this.req.form['password'],
                    }, function (err, staffDocument) {
                        if (err || staffDocument === null) {
                            _this.req.form.errors.push(_this.req.__('Message.invalid{{fieldName}}', { fieldName: _this.req.__('Form.FieldName.password') }));
                            _this.res.render('staff/auth/login', {
                                layout: 'layouts/staff/layout'
                            });
                        }
                        else {
                            // ログイン
                            _this.req.session[StaffUser_1.default.AUTH_SESSION_NAME] = staffDocument.toObject();
                            _this.req.session[StaffUser_1.default.AUTH_SESSION_NAME]['signature'] = _this.req.form['signature'];
                            _this.res.redirect(_this.router.build('staff.mypage', {}));
                        }
                    });
                }
                else {
                    _this.res.render('staff/auth/login', {
                        layout: 'layouts/staff/layout'
                    });
                }
            });
        }
        else {
            this.res.locals.userId = '';
            this.res.locals.password = '';
            this.res.locals.signature = '';
            this.res.render('staff/auth/login', {
                layout: 'layouts/staff/layout'
            });
        }
    };
    StaffAuthController.prototype.logout = function () {
        delete this.req.session[StaffUser_1.default.AUTH_SESSION_NAME];
        this.res.redirect('/');
    };
    return StaffAuthController;
}(BaseController_1.default));
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = StaffAuthController;
