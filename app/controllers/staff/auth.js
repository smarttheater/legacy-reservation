"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const chevre_domain_1 = require("@motionpicture/chevre-domain");
const _ = require("underscore");
const staffLoginForm_1 = require("../../forms/staff/staffLoginForm");
const staff_1 = require("../../models/user/staff");
const base_1 = require("../base");
/**
 * 内部関係者認証コントローラー
 *
 * @export
 * @class StaffAuthController
 * @extends {BaseController}
 */
class StaffAuthController extends base_1.default {
    constructor() {
        super(...arguments);
        this.layout = 'layouts/staff/layout';
    }
    /**
     * 内部関係者ログイン
     * @method login
     * @returns {Promise<void>}
     */
    login() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.req.staffUser !== undefined && this.req.staffUser.isAuthenticated()) {
                this.res.redirect('/staff/mypage');
                return;
            }
            if (this.req.method === 'POST') {
                staffLoginForm_1.default(this.req);
                const validationResult = yield this.req.getValidationResult();
                if (!validationResult.isEmpty()) {
                    this.res.locals.userId = this.req.body.userId;
                    this.res.locals.password = '';
                    this.res.locals.language = this.req.body.language;
                    this.res.locals.remember = this.req.body.remember;
                    this.res.locals.signature = this.req.body.signature;
                    this.res.locals.validation = validationResult.array();
                    this.res.render('staff/auth/login', { layout: this.layout });
                    return;
                }
                try {
                    // ユーザー認証
                    const staff = yield chevre_domain_1.Models.Staff.findOne({
                        user_id: this.req.body.userId
                    }).exec();
                    this.res.locals.userId = this.req.body.userId;
                    this.res.locals.password = '';
                    this.res.locals.language = this.req.body.language;
                    this.res.locals.remember = this.req.body.remember;
                    this.res.locals.signature = this.req.body.signature;
                    if (staff === null) {
                        this.res.locals.validation = [
                            { msg: this.req.__('Message.invalid{{fieldName}}', { fieldName: this.req.__('Form.FieldName.password') }) }
                        ];
                        this.res.render('staff/auth/login', { layout: this.layout });
                        return;
                    }
                    // パスワードチェック
                    if (staff.get('password_hash') !== chevre_domain_1.CommonUtil.createHash(this.req.body.password, staff.get('password_salt'))) {
                        this.res.locals.validation = [
                            { msg: this.req.__('Message.invalid{{fieldName}}', { fieldName: this.req.__('Form.FieldName.password') }) }
                        ];
                        this.res.render('staff/auth/login', { layout: this.layout });
                        return;
                    }
                    // ログイン記憶
                    if (this.req.body.remember === 'on') {
                        // トークン生成
                        const authentication = yield chevre_domain_1.Models.Authentication.create({
                            token: chevre_domain_1.CommonUtil.createToken(),
                            staff: staff.get('_id'),
                            signature: this.req.body.signature,
                            locale: this.req.body.language
                        });
                        // tslint:disable-next-line:no-cookies
                        this.res.cookie('remember_staff', authentication.get('token'), { path: '/', httpOnly: true, maxAge: 604800000 });
                    }
                    // ログイン
                    this.req.session[staff_1.default.AUTH_SESSION_NAME] = staff.toObject();
                    this.req.session[staff_1.default.AUTH_SESSION_NAME].signature = this.req.body.signature;
                    this.req.session[staff_1.default.AUTH_SESSION_NAME].locale = this.req.body.language;
                    const cb = (!_.isEmpty(this.req.query.cb)) ? this.req.query.cb : '/staff/mypage';
                    this.res.redirect(cb);
                    return;
                }
                catch (error) {
                    this.next(new Error(this.req.__('Message.UnexpectedError')));
                    return;
                }
            }
            else {
                this.res.locals.userId = '';
                this.res.locals.password = '';
                this.res.locals.signature = '';
                this.res.render('staff/auth/login', { layout: this.layout });
            }
        });
    }
    logout() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (this.req.session === undefined) {
                    this.next(new Error(this.req.__('Message.UnexpectedError')));
                    return;
                }
                delete this.req.session[staff_1.default.AUTH_SESSION_NAME];
                yield chevre_domain_1.Models.Authentication.remove({ token: this.req.cookies.remember_staff }).exec();
                this.res.clearCookie('remember_staff');
                this.res.redirect('/staff/mypage');
            }
            catch (error) {
                this.next(error);
            }
        });
    }
}
exports.default = StaffAuthController;
