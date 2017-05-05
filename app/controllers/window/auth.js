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
const windowLoginForm_1 = require("../../forms/window/windowLoginForm");
const window_1 = require("../../models/user/window");
const base_1 = require("../base");
/**
 * 当日窓口認証コントローラー
 *
 * @export
 * @class WindowAuthController
 * @extends {BaseController}
 */
class WindowAuthController extends base_1.default {
    constructor() {
        super(...arguments);
        this.layout = 'layouts/window/layout';
    }
    /**
     * 窓口担当者ログイン
     * @method login
     * @returns {Promise<void>}
     */
    login() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.req.windowUser !== undefined && this.req.windowUser.isAuthenticated()) {
                this.res.redirect('/window/mypage');
                return;
            }
            if (this.req.method === 'POST') {
                windowLoginForm_1.default(this.req);
                const validationResult = yield this.req.getValidationResult();
                if (!validationResult.isEmpty()) {
                    this.res.locals.userId = this.req.body.userId;
                    this.res.locals.password = '';
                    this.res.locals.validation = validationResult.array();
                    this.res.render('window/auth/login', { layout: this.layout });
                    return;
                }
                try {
                    // ユーザー認証
                    const window = yield chevre_domain_1.Models.Window.findOne({
                        user_id: this.req.body.userId
                    }).exec();
                    this.res.locals.userId = this.req.body.userId;
                    this.res.locals.password = '';
                    if (window === null) {
                        this.res.locals.validation = [
                            { msg: this.req.__('Message.invalid{{fieldName}}', { fieldName: this.req.__('Form.FieldName.password') }) }
                        ];
                        this.res.render('window/auth/login', { layout: this.layout });
                        return;
                    }
                    // パスワードチェック
                    if (window.get('password_hash') !== chevre_domain_1.CommonUtil.createHash(this.req.body.password, window.get('password_salt'))) {
                        this.res.locals.validation = [
                            { msg: this.req.__('Message.invalid{{fieldName}}', { fieldName: this.req.__('Form.FieldName.password') }) }
                        ];
                        this.res.render('window/auth/login', { layout: this.layout });
                        return;
                    }
                    // ログイン記憶
                    if (this.req.body.remember === 'on') {
                        // トークン生成
                        const authentication = yield chevre_domain_1.Models.Authentication.create({
                            token: chevre_domain_1.CommonUtil.createToken(),
                            window: window.get('_id')
                        });
                        // tslint:disable-next-line:no-cookies
                        this.res.cookie('remember_window', authentication.get('token'), { path: '/', httpOnly: true, maxAge: 604800000 });
                    }
                    // ログイン
                    this.req.session[window_1.default.AUTH_SESSION_NAME] = window.toObject();
                    const cb = (!_.isEmpty(this.req.query.cb)) ? this.req.query.cb : '/window/mypage';
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
                this.res.render('window/auth/login', { layout: this.layout });
                return;
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
                delete this.req.session[window_1.default.AUTH_SESSION_NAME];
                yield chevre_domain_1.Models.Authentication.remove({ token: this.req.cookies.remember_window }).exec();
                this.res.clearCookie('remember_window');
                this.res.redirect('/window/mypage');
            }
            catch (error) {
                this.next(error);
            }
        });
    }
}
exports.default = WindowAuthController;
