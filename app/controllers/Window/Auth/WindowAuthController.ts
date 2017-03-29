import { Models } from '@motionpicture/chevre-domain';
import * as _ from 'underscore';

import * as Util from '../../../../common/Util/Util';
import windowLoginForm from '../../../forms/window/windowLoginForm';
import WindowUser from '../../../models/User/WindowUser';
import BaseController from '../../BaseController';

/**
 * 当日窓口認証コントローラー
 *
 * @export
 * @class WindowAuthController
 * @extends {BaseController}
 */
export default class WindowAuthController extends BaseController {
    public layout: string = 'layouts/window/layout';

    /**
     * 窓口担当者ログイン
     */
    public login(): void {
        if (this.req.windowUser !== undefined && this.req.windowUser.isAuthenticated()) {
            this.res.redirect(this.router.build('window.mypage'));
            return;
        }

        if (this.req.method === 'POST') {
            windowLoginForm(this.req)(this.req, this.res, async () => {
                const form = this.req.form;
                if (form !== undefined && form.isValid) {
                    try {
                        // ユーザー認証
                        const window = await Models.Window.findOne(
                            {
                                user_id: (<any>form).userId
                            }
                        ).exec();

                        if (window === null) {
                            form.errors.push(
                                this.req.__('Message.invalid{{fieldName}}', { fieldName: this.req.__('Form.FieldName.password') })
                            );
                            this.res.render('window/auth/login');
                            return;
                        }

                        // パスワードチェック
                        if (window.get('password_hash') !== Util.createHash((<any>form).password, window.get('password_salt'))) {
                            form.errors.push(
                                this.req.__('Message.invalid{{fieldName}}', { fieldName: this.req.__('Form.FieldName.password') })
                            );
                            this.res.render('window/auth/login');
                            return;
                        }

                        // ログイン記憶
                        if ((<any>form).remember === 'on') {
                            // トークン生成
                            const authentication = await Models.Authentication.create(
                                {
                                    token: Util.createToken(),
                                    window: window.get('_id')
                                }
                            );
                            // tslint:disable-next-line:no-cookies
                            this.res.cookie(
                                'remember_window',
                                authentication.get('token'),
                                { path: '/', httpOnly: true, maxAge: 604800000 }
                            );
                        }

                        // ログイン
                        (<Express.Session>this.req.session)[WindowUser.AUTH_SESSION_NAME] = window.toObject();

                        const cb = (!_.isEmpty(this.req.query.cb)) ? this.req.query.cb : this.router.build('window.mypage');
                        this.res.redirect(cb);
                    } catch (error) {
                        this.next(new Error(this.req.__('Message.UnexpectedError')));
                    }
                } else {
                    this.res.render('window/auth/login');
                }
            });
        } else {
            this.res.locals.userId = '';
            this.res.locals.password = '';

            this.res.render('window/auth/login');
        }
    }

    public async logout(): Promise<void> {
        try {
            if (this.req.session === undefined) {
                this.next(new Error(this.req.__('Message.UnexpectedError')));
                return;
            }

            delete this.req.session[WindowUser.AUTH_SESSION_NAME];
            await Models.Authentication.remove({ token: this.req.cookies.remember_window }).exec();

            this.res.clearCookie('remember_window');
            this.res.redirect(this.router.build('window.mypage'));
        } catch (error) {
            this.next(error);
        }
    }
}
