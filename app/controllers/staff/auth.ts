import { CommonUtil, Models } from '@motionpicture/chevre-domain';
import * as _ from 'underscore';

import staffLoginForm from '../../forms/staff/staffLoginForm';
import StaffUser from '../../models/user/staff';
import BaseController from '../base';

/**
 * 内部関係者認証コントローラー
 *
 * @export
 * @class StaffAuthController
 * @extends {BaseController}
 */
export default class StaffAuthController extends BaseController {
    public layout: string = 'layouts/staff/layout';

    /**
     * 内部関係者ログイン
     * @method login
     * @returns {Promise<void>}
     */
    public async login(): Promise<void> {
        if (this.req.staffUser !== undefined && this.req.staffUser.isAuthenticated()) {
            this.res.redirect('/staff/mypage');
            return;
        }

        if (this.req.method === 'POST') {
            staffLoginForm(this.req);
            const validationResult = await this.req.getValidationResult();
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
                const staff = await Models.Staff.findOne(
                    {
                        user_id: this.req.body.userId
                    }
                ).exec();

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
                if (staff.get('password_hash') !== CommonUtil.createHash(this.req.body.password, staff.get('password_salt'))) {
                    this.res.locals.validation = [
                        { msg: this.req.__('Message.invalid{{fieldName}}', { fieldName: this.req.__('Form.FieldName.password') }) }
                    ];
                    this.res.render('staff/auth/login', { layout: this.layout });
                    return;
                }

                // ログイン記憶
                if (this.req.body.remember === 'on') {
                    // トークン生成
                    const authentication = await Models.Authentication.create(
                        {
                            token: CommonUtil.createToken(),
                            staff: staff.get('_id'),
                            signature: this.req.body.signature,
                            locale: this.req.body.language
                        }
                    );
                    // tslint:disable-next-line:no-cookies
                    this.res.cookie(
                        'remember_staff',
                        authentication.get('token'),
                        { path: '/', httpOnly: true, maxAge: 604800000 }
                    );
                }

                // ログイン
                (<Express.Session>this.req.session)[StaffUser.AUTH_SESSION_NAME] = staff.toObject();
                (<Express.Session>this.req.session)[StaffUser.AUTH_SESSION_NAME].signature = this.req.body.signature;
                (<Express.Session>this.req.session)[StaffUser.AUTH_SESSION_NAME].locale = this.req.body.language;

                const cb = (!_.isEmpty(this.req.query.cb)) ? this.req.query.cb : '/staff/mypage';
                this.res.redirect(cb);
                return;
            } catch (error) {
                this.next(new Error(this.req.__('Message.UnexpectedError')));
                return;
            }
        } else {
            this.res.locals.userId = '';
            this.res.locals.password = '';
            this.res.locals.signature = '';

            this.res.render('staff/auth/login', { layout: this.layout });
        }
    }

    public async logout(): Promise<void> {
        try {
            if (this.req.session === undefined) {
                this.next(new Error(this.req.__('Message.UnexpectedError')));
                return;
            }

            delete this.req.session[StaffUser.AUTH_SESSION_NAME];
            await Models.Authentication.remove({ token: this.req.cookies.remember_staff }).exec();

            this.res.clearCookie('remember_staff');
            this.res.redirect('/staff/mypage');
        } catch (error) {
            this.next(error);
        }
    }
}
