import { CommonUtil, Models } from '@motionpicture/chevre-domain';
import * as _ from 'underscore';

import windowLoginForm from '../../forms/window/windowLoginForm';
import WindowUser from '../../models/user/window';
import BaseController from '../base';

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
     * @method login
     * @returns {Promise<void>}
     */
    public async login(): Promise<void> {
        if (this.req.windowUser !== undefined && this.req.windowUser.isAuthenticated()) {
            this.res.redirect('/window/mypage');
            return;
        }

        if (this.req.method === 'POST') {
            windowLoginForm(this.req);
            const validationResult = await this.req.getValidationResult();
            if (!validationResult.isEmpty()) {
                this.res.locals.userId = this.req.body.userId;
                this.res.locals.password = '';
                this.res.locals.validation = validationResult.array();
                this.res.render('window/auth/login', { layout: this.layout });
                return;
            }
            try {
                // ユーザー認証
                const window = await Models.Window.findOne(
                    {
                        user_id: this.req.body.userId
                    }
                ).exec();

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
                if (window.get('password_hash') !== CommonUtil.createHash(this.req.body.password, window.get('password_salt'))) {
                    this.res.locals.validation = [
                        { msg: this.req.__('Message.invalid{{fieldName}}', { fieldName: this.req.__('Form.FieldName.password') }) }
                    ];
                    this.res.render('window/auth/login', { layout: this.layout });
                    return;
                }

                // ログイン記憶
                if (this.req.body.remember === 'on') {
                    // トークン生成
                    const authentication = await Models.Authentication.create(
                        {
                            token: CommonUtil.createToken(),
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

                const cb = (!_.isEmpty(this.req.query.cb)) ? this.req.query.cb : '/window/mypage';
                this.res.redirect(cb);
                return;
            } catch (error) {
                this.next(new Error(this.req.__('Message.UnexpectedError')));
                return;
            }
        } else {
            this.res.locals.userId = '';
            this.res.locals.password = '';

            this.res.render('window/auth/login', { layout: this.layout });
            return;
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
            this.res.redirect('/window/mypage');
        } catch (error) {
            this.next(error);
        }
    }
}
