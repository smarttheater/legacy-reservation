import { Models } from '@motionpicture/chevre-domain';
import * as _ from 'underscore';

import * as Util from '../../../../common/Util/Util';
import staffLoginForm from '../../../forms/staff/staffLoginForm';
import StaffUser from '../../../models/User/StaffUser';
import BaseController from '../../BaseController';

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
     */
    public login(): void {
        if (this.req.staffUser !== undefined && this.req.staffUser.isAuthenticated()) {
            this.res.redirect('/staff/mypage');
            return;
        }

        if (this.req.method === 'POST') {
            staffLoginForm(this.req)(this.req, this.res, async () => {
                const form = this.req.form;
                if (form !== undefined && form.isValid) {
                    try {
                        // ユーザー認証
                        this.logger.debug('finding staff... user_id:', (<any>form).userId);
                        const staff = await Models.Staff.findOne(
                            {
                                user_id: (<any>form).userId
                            }
                        ).exec();

                        if (staff === null) {
                            form.errors.push(
                                this.req.__('Message.invalid{{fieldName}}', { fieldName: this.req.__('Form.FieldName.password') })
                            );
                            this.res.render('staff/auth/login');
                            return;
                        }

                        // パスワードチェック
                        if (staff.get('password_hash') !== Util.createHash((<any>form).password, staff.get('password_salt'))) {
                            form.errors.push(
                                this.req.__('Message.invalid{{fieldName}}', { fieldName: this.req.__('Form.FieldName.password') })
                            );
                            this.res.render('staff/auth/login');
                            return;
                        }

                        // ログイン記憶
                        if ((<any>form).remember === 'on') {
                            // トークン生成
                            const authentication = await Models.Authentication.create(
                                {
                                    token: Util.createToken(),
                                    staff: staff.get('_id'),
                                    signature: (<any>form).signature,
                                    locale: (<any>form).language
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
                        (<Express.Session>this.req.session)[StaffUser.AUTH_SESSION_NAME].signature = (<any>form).signature;
                        (<Express.Session>this.req.session)[StaffUser.AUTH_SESSION_NAME].locale = (<any>form).language;

                        const cb = (!_.isEmpty(this.req.query.cb)) ? this.req.query.cb : '/staff/mypage';
                        this.res.redirect(cb);
                    } catch (error) {
                        this.next(new Error(this.req.__('Message.UnexpectedError')));
                    }
                } else {
                    this.res.render('staff/auth/login');
                }
            });
        } else {
            this.res.locals.userId = '';
            this.res.locals.password = '';
            this.res.locals.signature = '';

            this.res.render('staff/auth/login');
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
