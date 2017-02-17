import { Models } from '@motionpicture/ttts-domain';
import * as mongoose from 'mongoose';
import Util from '../../../../common/Util/Util';
import telLoginForm from '../../../forms/tel/telLoginForm';
import TelStaffUser from '../../../models/User/TelStaffUser';
import BaseController from '../../BaseController';

export default class TelAuthController extends BaseController {
    public layout = 'layouts/tel/layout';

    /**
     * 窓口担当者ログイン
     */
    public login(): void {
        if (this.req.telStaffUser.isAuthenticated()) {
            return this.res.redirect(this.router.build('tel.mypage'));
        }

        if (this.req.method === 'POST') {
            const form = telLoginForm(this.req);
            form(this.req, this.res, () => {
                if (this.req.form.isValid) {

                    // ユーザー認証
                    Models.TelStaff.findOne(
                        {
                            user_id: (<any>this.req.form).userId
                        },
                        (findTelStaffErr, telStaff) => {
                            if (findTelStaffErr) return this.next(new Error(this.req.__('Message.UnexpectedError')));

                            if (!telStaff) {
                                this.req.form.errors.push(this.req.__('Message.invalid{{fieldName}}', { fieldName: this.req.__('Form.FieldName.password') }));
                                this.res.render('tel/auth/login');
                            } else {
                                // パスワードチェック
                                if (telStaff.get('password_hash') !== Util.createHash((<any>this.req.form).password, telStaff.get('password_salt'))) {
                                    this.req.form.errors.push(this.req.__('Message.invalid{{fieldName}}', { fieldName: this.req.__('Form.FieldName.password') }));
                                    this.res.render('tel/auth/login');

                                } else {
                                    // ログイン記憶
                                    const processRemember = (cb: (err: Error, token: string) => void) => {
                                        if ((<any>this.req.form).remember) {
                                            // トークン生成
                                            Models.Authentication.create(
                                                {
                                                    token: Util.createToken(),
                                                    tel_staff: telStaff.get('_id')
                                                },
                                                (createAuthenticationErr: any, authentication: mongoose.Document) => {
                                                    this.res.cookie('remember_tel_staff', authentication.get('token'), { path: '/', httpOnly: true, maxAge: 604800000 });
                                                    cb(createAuthenticationErr, authentication.get('token'));
                                                }
                                            );
                                        } else {
                                            cb(null, null);
                                        }
                                    };

                                    processRemember((processRememberErr) => {
                                        if (processRememberErr) return this.next(new Error(this.req.__('Message.UnexpectedError')));

                                        // ログイン
                                        this.req.session[TelStaffUser.AUTH_SESSION_NAME] = telStaff.toObject();

                                        // if exist parameter cb, redirect to cb.
                                        const cb = (this.req.query.cb) ? this.req.query.cb : this.router.build('tel.mypage');
                                        this.res.redirect(cb);
                                    });
                                }
                            }
                        }
                    );
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

    public logout(): void {
        delete this.req.session[TelStaffUser.AUTH_SESSION_NAME];
        Models.Authentication.remove({ token: this.req.cookies.remember_tel_staff }, (err) => {
            if (err) return this.next(err);

            this.res.clearCookie('remember_tel_staff');
            this.res.redirect(this.router.build('tel.mypage'));
        });
    }
}
