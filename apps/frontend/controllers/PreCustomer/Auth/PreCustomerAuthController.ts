import BaseController from '../../BaseController';
import PreCustomerUser from '../../../models/User/PreCustomerUser';
import preCustomerLoginForm from '../../../forms/preCustomer/preCustomerLoginForm';
import Util from '../../../../common/Util/Util';
import Models from '../../../../common/models/Models';
import moment = require('moment');
import conf = require('config');

export default class PreCustomerAuthController extends BaseController {
    public layout = 'layouts/preCustomer/layout';

    /**
     * pre customer login
     */
    public login(): void {
        // 期限指定
        let now = moment();
        if (now < moment(conf.get<string>('datetimes.reservation_start_pre_customers')) || moment(conf.get<string>('datetimes.reservation_end_pre_customers')) < now) {
            return this.res.render('preCustomer/reserve/outOfTerm', {layout: false});
        }

        if (this.req.preCustomerUser.isAuthenticated()) {
            return this.res.redirect(this.router.build('pre.reserve.start'));
        }

        if (this.req.method === 'POST') {
            let form = preCustomerLoginForm(this.req);
            form(this.req, this.res, (err) => {
                if (this.req.form.isValid) {

                    // ユーザー認証
                    this.logger.debug('finding preCustomer... user_id:', this.req.form['userId']);
                    Models.PreCustomer.findOne(
                        {
                            user_id: this.req.form['userId']
                        },
                        (err, preCustomer) => {
                            if (err) return this.next(new Error(this.req.__('Message.UnexpectedError')));

                            if (!preCustomer) {
                                this.req.form.errors.push(this.req.__('Message.invalid{{fieldName}}', {fieldName: this.req.__('Form.FieldName.password')}));
                                this.res.render('preCustomer/auth/login');
                            } else {
                                // パスワードチェック
                                if (preCustomer.get('password_hash') !== Util.createHash(this.req.form['password'], preCustomer.get('password_salt'))) {
                                    this.req.form.errors.push(this.req.__('Message.invalid{{fieldName}}', {fieldName: this.req.__('Form.FieldName.password')}));
                                    this.res.render('preCustomer/auth/login');

                                } else {
                                    // ログイン記憶
                                    let processRemember = (cb: (err: Error, token: string) => void) => {
                                        if (this.req.form['remember']) {
                                            // トークン生成
                                            Models.Authentication.create(
                                                {
                                                    token: Util.createToken(),
                                                    pre_customer: preCustomer.get('_id'),
                                                    locale: this.req.form['language']
                                                },
                                                (err, authentication) => {
                                                    this.res.cookie('remember_pre_customer', authentication.get('token'), { path: '/', httpOnly: true, maxAge: 604800000 });
                                                    cb(err, authentication.get('token'));
                                                }
                                            );
                                        } else {
                                            cb(null, null);
                                        }
                                    }

                                    processRemember((err, token) => {
                                        if (err) return this.next(new Error(this.req.__('Message.UnexpectedError')));

                                        // ログイン
                                        this.req.session[PreCustomerUser.AUTH_SESSION_NAME] = preCustomer.toObject();
                                        this.req.session[PreCustomerUser.AUTH_SESSION_NAME]['locale'] = this.req.form['language'];

                                        // if exist parameter cb, redirect to cb.
                                        let cb = (this.req.query.cb) ? this.req.query.cb : this.router.build('pre.reserve.start');
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
        delete this.req.session[PreCustomerUser.AUTH_SESSION_NAME];
        Models.Authentication.remove({token: this.req.cookies.remember_pre_customer}, (err) => {
            this.res.clearCookie('remember_pre_customer');
            this.res.redirect(this.router.build('pre.reserve.start'));
        });
    }
}
