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
const Util = require("../../../../common/Util/Util");
const telLoginForm_1 = require("../../../forms/tel/telLoginForm");
const TelStaffUser_1 = require("../../../models/User/TelStaffUser");
const BaseController_1 = require("../../BaseController");
/**
 * 電話窓口認証コントローラー
 *
 * @export
 * @class TelAuthController
 * @extends {BaseController}
 */
class TelAuthController extends BaseController_1.default {
    constructor() {
        super(...arguments);
        this.layout = 'layouts/tel/layout';
    }
    /**
     * 窓口担当者ログイン
     */
    login() {
        if (this.req.telStaffUser !== undefined && this.req.telStaffUser.isAuthenticated()) {
            this.res.redirect('/tel/mypage');
            return;
        }
        if (this.req.method === 'POST') {
            telLoginForm_1.default(this.req)(this.req, this.res, () => __awaiter(this, void 0, void 0, function* () {
                const form = this.req.form;
                if (form !== undefined && form.isValid) {
                    try {
                        // ユーザー認証
                        const telStaff = yield chevre_domain_1.Models.TelStaff.findOne({
                            user_id: form.userId
                        }).exec();
                        if (telStaff === null) {
                            form.errors.push(this.req.__('Message.invalid{{fieldName}}', { fieldName: this.req.__('Form.FieldName.password') }));
                            this.res.render('tel/auth/login');
                            return;
                        }
                        // パスワードチェック
                        if (telStaff.get('password_hash') !== Util.createHash(form.password, telStaff.get('password_salt'))) {
                            form.errors.push(this.req.__('Message.invalid{{fieldName}}', { fieldName: this.req.__('Form.FieldName.password') }));
                            this.res.render('tel/auth/login');
                            return;
                        }
                        // ログイン記憶
                        if (form.remember === 'on') {
                            // トークン生成
                            const authentication = yield chevre_domain_1.Models.Authentication.create({
                                token: Util.createToken(),
                                tel_staff: telStaff.get('_id')
                            });
                            // tslint:disable-next-line:no-cookies
                            this.res.cookie('remember_tel_staff', authentication.get('token'), { path: '/', httpOnly: true, maxAge: 604800000 });
                        }
                        // ログイン
                        this.req.session[TelStaffUser_1.default.AUTH_SESSION_NAME] = telStaff.toObject();
                        const cb = (!_.isEmpty(this.req.query.cb)) ? this.req.query.cb : '/tel/mypage';
                        this.res.redirect(cb);
                    }
                    catch (error) {
                        this.next(new Error(this.req.__('Message.UnexpectedError')));
                    }
                }
                else {
                    this.res.render('tel/auth/login');
                }
            }));
        }
        else {
            this.res.locals.userId = '';
            this.res.locals.password = '';
            this.res.render('tel/auth/login');
        }
    }
    logout() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (this.req.session === undefined) {
                    this.next(new Error(this.req.__('Message.UnexpectedError')));
                    return;
                }
                delete this.req.session[TelStaffUser_1.default.AUTH_SESSION_NAME];
                yield chevre_domain_1.Models.Authentication.remove({ token: this.req.cookies.remember_tel_staff }).exec();
                this.res.clearCookie('remember_tel_staff');
                this.res.redirect('/tel/mypage');
            }
            catch (error) {
                this.next(error);
            }
        });
    }
}
exports.default = TelAuthController;
