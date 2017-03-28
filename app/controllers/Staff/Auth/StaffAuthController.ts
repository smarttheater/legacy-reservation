import { Models } from '@motionpicture/chevre-domain';
import * as mongoose from 'mongoose';
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
        if (this.req.staffUser && this.req.staffUser.isAuthenticated()) {
            return this.res.redirect(this.router.build('staff.mypage'));
        }

        if (this.req.method === 'POST') {
            staffLoginForm(this.req)(this.req, this.res, () => {
                const form = this.req.form;
                if (form && form.isValid) {

                    // ユーザー認証
                    this.logger.debug('finding staff... user_id:', (<any>form).userId);
                    Models.Staff.findOne(
                        {
                            user_id: (<any>form).userId
                        },
                        (findStaffErr, staff) => {
                            if (findStaffErr) return this.next(new Error(this.req.__('Message.UnexpectedError')));

                            if (!staff) {
                                form.errors.push(this.req.__('Message.invalid{{fieldName}}', { fieldName: this.req.__('Form.FieldName.password') }));
                                this.res.render('staff/auth/login');
                            } else {
                                // パスワードチェック
                                if (staff.get('password_hash') !== Util.createHash((<any>form).password, staff.get('password_salt'))) {
                                    form.errors.push(this.req.__('Message.invalid{{fieldName}}', { fieldName: this.req.__('Form.FieldName.password') }));
                                    this.res.render('staff/auth/login');

                                } else {
                                    // ログイン記憶
                                    const processRemember = (cb: (err: Error | null, token: string | null) => void) => {
                                        if ((<any>form).remember) {
                                            // トークン生成
                                            Models.Authentication.create(
                                                {
                                                    token: Util.createToken(),
                                                    staff: staff.get('_id'),
                                                    signature: (<any>form).signature,
                                                    locale: (<any>form).language
                                                },
                                                (createAuthenticationErr: any, authentication: mongoose.Document) => {
                                                    this.res.cookie('remember_staff', authentication.get('token'), { path: '/', httpOnly: true, maxAge: 604800000 });
                                                    cb(createAuthenticationErr, authentication.get('token'));
                                                }
                                            );
                                        } else {
                                            cb(null, null);
                                        }
                                    };

                                    processRemember((processRememberErr) => {
                                        if (!this.req.session) return this.next(new Error(this.req.__('Message.UnexpectedError')));
                                        if (processRememberErr) return this.next(new Error(this.req.__('Message.UnexpectedError')));

                                        this.req.session[StaffUser.AUTH_SESSION_NAME] = staff.toObject();
                                        this.req.session[StaffUser.AUTH_SESSION_NAME].signature = (<any>form).signature;
                                        this.req.session[StaffUser.AUTH_SESSION_NAME].locale = (<any>form).language;

                                        // if exist parameter cb, redirect to cb.
                                        const cb = (this.req.query.cb) ? this.req.query.cb : this.router.build('staff.mypage');
                                        this.res.redirect(cb);
                                    });
                                }

                            }
                        }
                    );

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

    public logout(): void {
        if (!this.req.session) return this.next(new Error(this.req.__('Message.UnexpectedError')));

        delete this.req.session[StaffUser.AUTH_SESSION_NAME];
        Models.Authentication.remove({ token: this.req.cookies.remember_staff }, (err) => {
            if (err) return this.next(err);

            this.res.clearCookie('remember_staff');
            this.res.redirect(this.router.build('staff.mypage'));
        });
    }
}
