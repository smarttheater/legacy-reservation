"use strict";
const BaseController_1 = require('../../BaseController');
const MvtkUser_1 = require('../../../models/User/MvtkUser');
const customerLoginForm_1 = require('../../../forms/customer/customerLoginForm');
const mvtkService = require('@motionpicture/mvtk-service');
class CustomerAuthController extends BaseController_1.default {
    /**
     * ログイン
     */
    login() {
        let cb = (this.req.query.cb) ? this.req.query.cb : this.router.build('Home');
        if (this.mvtkUser.isAuthenticated()) {
            return this.res.redirect(cb);
        }
        if (this.req.method === 'POST') {
            let form = customerLoginForm_1.default(this.req);
            form(this.req, this.res, (err) => {
                if (this.req.form.isValid) {
                    let memberInfoService = mvtkService.createMemberInfoService();
                    memberInfoService.getMemberAuthorization(this.req.form['email'], this.req.form['password'], (err, response, kiinCd) => {
                        if (err)
                            return this.next(err);
                        if (kiinCd) {
                            let utilService = mvtkService.createUtilService();
                            utilService.signIn(kiinCd, (err, response, cookieString) => {
                                if (err)
                                    return this.next(err);
                                // サービス側でログイン成功
                                // 会員情報詳細を取得しておく(クッキーをセットしてサービスを再生成)
                                mvtkService.setCookie(cookieString);
                                memberInfoService = mvtkService.createMemberInfoService();
                                memberInfoService.getMemberInfoDetail((err, response, memberInfoResult) => {
                                    if (err) {
                                        return this.next(err);
                                    }
                                    ;
                                    // セッションにクッキー文字列をセット
                                    this.mvtkUser.memberInfoResult = memberInfoResult;
                                    this.req.session[MvtkUser_1.default.AUTH_SESSION_NAME] = this.mvtkUser;
                                    this.res.redirect(cb);
                                });
                            });
                        }
                        else {
                            this.req.form.errors.push('メールアドレスまたはパスワードが正しくありません');
                            this.res.render('customer/auth/login');
                        }
                    });
                }
                else {
                    this.res.render('customer/auth/login');
                }
            });
        }
        else {
            this.res.locals.email = '';
            this.res.locals.password = '';
            this.res.render('customer/auth/login');
        }
    }
    logout() {
        delete this.req.session[MvtkUser_1.default.AUTH_SESSION_NAME];
        this.res.redirect('/');
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = CustomerAuthController;
