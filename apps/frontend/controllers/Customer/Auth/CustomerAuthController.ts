import BaseController from '../../BaseController';
import MvtkUser from '../../../models/User/MvtkUser';
import customerLoginForm from '../../../forms/customer/customerLoginForm';
import mvtkService = require('@motionpicture/mvtk-service');

export default class CustomerAuthController extends BaseController {
    /**
     * ログイン
     */
    public login(): void {
        let cb = (this.req.query.cb) ? this.req.query.cb : this.router.build('Home');

        if (this.mvtkUser.isAuthenticated()) {
            return this.res.redirect(cb);
        }

        if (this.req.method === 'POST') {
            let form = customerLoginForm(this.req);
            form(this.req, this.res, (err) => {
                if (this.req.form.isValid) {
                    let memberInfoService = mvtkService.createMemberInfoService();
                    memberInfoService.getMemberAuthorization(this.req.form['email'], this.req.form['password'], (err, response, kiinCd) => {
                        if (err) return this.next(err);

                        if (kiinCd) {
                            let utilService = mvtkService.createUtilService();
                            utilService.signIn(kiinCd, (err, response, cookieString) => {
                                if (err) return this.next(err);

                                // サービス側でログイン成功

                                // 会員情報詳細を取得しておく(クッキーをセットしてサービスを再生成)
                                mvtkService.setCookie(cookieString);
                                memberInfoService = mvtkService.createMemberInfoService();
                                memberInfoService.getMemberInfoDetail((err, response, memberInfoResult) => {
                                    if (err) {
                                        return this.next(err)
                                    };

                                    // セッションにクッキー文字列をセット
                                    this.mvtkUser.memberInfoResult = memberInfoResult;
                                    this.req.session[MvtkUser.AUTH_SESSION_NAME] = this.mvtkUser;
                                    this.res.redirect(cb);

                                });
                            });

                        } else {
                            this.req.form.errors.push('メールアドレスまたはパスワードが正しくありません');
                            this.res.render('customer/auth/login');

                        }
                    });

                } else {
                    this.res.render('customer/auth/login');

                }

            });
        } else {
            this.res.locals.email = '';
            this.res.locals.password = '';

            this.res.render('customer/auth/login');

        }

    }
}
