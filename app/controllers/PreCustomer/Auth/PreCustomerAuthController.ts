import { Models } from '@motionpicture/chevre-domain';
import * as conf from 'config';
import * as moment from 'moment';
import * as mongoose from 'mongoose';
import * as Util from '../../../../common/Util/Util';
import preCustomerLoginForm from '../../../forms/preCustomer/preCustomerLoginForm';
import PreCustomerUser from '../../../models/User/PreCustomerUser';
import BaseController from '../../BaseController';

/**
 * 先行予約認証コントローラー
 *
 * @export
 * @class PreCustomerAuthController
 * @extends {BaseController}
 */
export default class PreCustomerAuthController extends BaseController {
    public layout: string = 'layouts/preCustomer/layout';

    /**
     * pre customer login
     */
    public login(): void {
        // MPのIPは許可
        // tslint:disable-next-line:no-empty
        if (this.req.headers['x-forwarded-for'] && /^124\.155\.113\.9$/.test(this.req.headers['x-forwarded-for'])) {
        } else {
            // 期限指定
            const now = moment();
            if (now < moment(conf.get<string>('datetimes.reservation_start_pre_customers')) || moment(conf.get<string>('datetimes.reservation_end_pre_customers')) < now) {
                return this.res.render('preCustomer/reserve/outOfTerm', { layout: false });
            }
        }

        if (this.req.preCustomerUser && this.req.preCustomerUser.isAuthenticated()) {
            return this.res.redirect(this.router.build('pre.reserve.start'));
        }

        if (this.req.method === 'POST') {
            preCustomerLoginForm(this.req)(this.req, this.res, () => {
                const form = this.req.form;
                if (form && form.isValid) {

                    // ユーザー認証
                    this.logger.debug('finding preCustomer... user_id:', (<any>form).userId);
                    Models.PreCustomer.findOne(
                        {
                            user_id: (<any>form).userId
                        },
                        (findPreCustomerErr, preCustomer) => {
                            if (findPreCustomerErr) return this.next(new Error(this.req.__('Message.UnexpectedError')));

                            if (!preCustomer) {
                                form.errors.push(this.req.__('Message.invalid{{fieldName}}', { fieldName: this.req.__('Form.FieldName.password') }));
                                this.res.render('preCustomer/auth/login');
                            } else {
                                // パスワードチェック
                                if (preCustomer.get('password_hash') !== Util.createHash((<any>form).password, preCustomer.get('password_salt'))) {
                                    form.errors.push(this.req.__('Message.invalid{{fieldName}}', { fieldName: this.req.__('Form.FieldName.password') }));
                                    this.res.render('preCustomer/auth/login');

                                } else {
                                    // ログイン記憶
                                    const processRemember = (cb: (err: Error | null, token: string | null) => void) => {
                                        if ((<any>form).remember) {
                                            // トークン生成
                                            Models.Authentication.create(
                                                {
                                                    token: Util.createToken(),
                                                    pre_customer: preCustomer.get('_id'),
                                                    locale: (<any>form).language
                                                },
                                                (createAuthenticationErr: any, authentication: mongoose.Document) => {
                                                    this.res.cookie('remember_pre_customer', authentication.get('token'), { path: '/', httpOnly: true, maxAge: 604800000 });
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

                                        // ログイン
                                        this.req.session[PreCustomerUser.AUTH_SESSION_NAME] = preCustomer.toObject();
                                        this.req.session[PreCustomerUser.AUTH_SESSION_NAME].locale = (<any>this.req.form).language;

                                        // if exist parameter cb, redirect to cb.
                                        const cb = (this.req.query.cb) ? this.req.query.cb : this.router.build('pre.reserve.start');
                                        this.res.redirect(cb);
                                    });
                                }
                            }
                        }
                    );
                } else {
                    this.res.render('preCustomer/auth/login');
                }
            });
        } else {
            this.res.locals.userId = '';
            this.res.locals.password = '';

            this.res.render('preCustomer/auth/login');
        }
    }

    public logout(): void {
        if (!this.req.session) return this.next(new Error(this.req.__('Message.UnexpectedError')));

        delete this.req.session[PreCustomerUser.AUTH_SESSION_NAME];
        Models.Authentication.remove({ token: this.req.cookies.remember_pre_customer }, (err) => {
            if (err) return this.next(err);

            this.res.clearCookie('remember_pre_customer');
            this.res.redirect(this.router.build('pre.reserve.start'));
        });
    }
}
