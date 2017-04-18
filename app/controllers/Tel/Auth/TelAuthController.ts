import { Models } from '@motionpicture/chevre-domain';
import * as _ from 'underscore';

import * as Util from '../../../../common/Util/Util';
import telLoginForm from '../../../forms/tel/telLoginForm';
import TelStaffUser from '../../../models/User/TelStaffUser';
import BaseController from '../../BaseController';

/**
 * 電話窓口認証コントローラー
 *
 * @export
 * @class TelAuthController
 * @extends {BaseController}
 */
export default class TelAuthController extends BaseController {
    public layout: string = 'layouts/tel/layout';

    /**
     * 窓口担当者ログイン
     */
    public login(): void {
        if (this.req.telStaffUser !== undefined && this.req.telStaffUser.isAuthenticated()) {
            this.res.redirect('/tel/mypage');
            return;
        }

        if (this.req.method === 'POST') {
            telLoginForm(this.req)(this.req, this.res, async () => {
                const form = this.req.form;
                if (form !== undefined && form.isValid) {
                    try {
                        // ユーザー認証
                        const telStaff = await Models.TelStaff.findOne(
                            {
                                user_id: (<any>form).userId
                            }
                        ).exec();

                        if (telStaff === null) {
                            form.errors.push(
                                this.req.__('Message.invalid{{fieldName}}', { fieldName: this.req.__('Form.FieldName.password') })
                            );
                            this.res.render('tel/auth/login');
                            return;
                        }

                        // パスワードチェック
                        if (telStaff.get('password_hash') !== Util.createHash((<any>form).password, telStaff.get('password_salt'))) {
                            form.errors.push(
                                this.req.__('Message.invalid{{fieldName}}', { fieldName: this.req.__('Form.FieldName.password') })
                            );
                            this.res.render('tel/auth/login');
                            return;
                        }

                        // ログイン記憶
                        if ((<any>form).remember === 'on') {
                            // トークン生成
                            const authentication = await Models.Authentication.create(
                                {
                                    token: Util.createToken(),
                                    tel_staff: telStaff.get('_id')
                                }
                            );
                            // tslint:disable-next-line:no-cookies
                            this.res.cookie(
                                'remember_tel_staff',
                                authentication.get('token'),
                                { path: '/', httpOnly: true, maxAge: 604800000 }
                            );
                        }

                        // ログイン
                        (<Express.Session>this.req.session)[TelStaffUser.AUTH_SESSION_NAME] = telStaff.toObject();

                        const cb = (!_.isEmpty(this.req.query.cb)) ? this.req.query.cb : '/tel/mypage';
                        this.res.redirect(cb);
                    } catch (error) {
                        this.next(new Error(this.req.__('Message.UnexpectedError')));
                    }
                } else {
                    this.res.render('tel/auth/login');
                }
            });
        } else {
            this.res.locals.userId = '';
            this.res.locals.password = '';

            this.res.render('tel/auth/login');
        }
    }

    public async logout(): Promise<void> {
        try {
            if (this.req.session === undefined) {
                this.next(new Error(this.req.__('Message.UnexpectedError')));
                return;
            }

            delete this.req.session[TelStaffUser.AUTH_SESSION_NAME];
            await Models.Authentication.remove({ token: this.req.cookies.remember_tel_staff }).exec();

            this.res.clearCookie('remember_tel_staff');
            this.res.redirect('/tel/mypage');
        } catch (error) {
            this.next(error);
        }
    }
}
