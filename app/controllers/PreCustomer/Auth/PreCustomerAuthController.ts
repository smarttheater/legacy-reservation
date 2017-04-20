import { Models } from '@motionpicture/chevre-domain';
import * as conf from 'config';
import * as moment from 'moment';
import * as _ from 'underscore';

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
     * @method login
     * @returns {Promise<void>}
     */
    public async login(): Promise<void> {
        // MPのIPは許可
        // tslint:disable-next-line:no-empty
        if (this.req.headers['x-forwarded-for'] !== undefined && /^124\.155\.113\.9$/.test(this.req.headers['x-forwarded-for'])) {
        } else {
            // 期限指定
            const now = moment();
            const dateStartPreCustomerReservation = moment(conf.get<string>('datetimes.reservation_start_pre_customers'));
            const dateEndPreCustomerReservation = moment(conf.get<string>('datetimes.reservation_end_pre_customers'));
            if (now < dateStartPreCustomerReservation || dateEndPreCustomerReservation < now) {
                this.res.render('preCustomer/reserve/outOfTerm', { layout: false });
                return;
            }
        }

        if (this.req.preCustomerUser !== undefined && this.req.preCustomerUser.isAuthenticated()) {
            this.res.redirect('/pre/reserve/start');
            return;
        }

        if (this.req.method === 'POST') {
            preCustomerLoginForm(this.req);
            const validationResult = await this.req.getValidationResult();
            if (!validationResult.isEmpty()) {
                this.res.locals.userId = this.req.body.userId;
                this.res.locals.password = '';
                this.res.locals.language = this.req.body.language;
                this.res.locals.remember = this.req.body.remember;
                this.res.locals.validation = validationResult.array();
                this.res.render('preCustomer/auth/login');
                return;
            }
            try {
                // ユーザー認証
                this.logger.debug('finding preCustomer... user_id:', this.req.body.userId);
                const preCustomer = await Models.PreCustomer.findOne(
                    {
                        user_id: this.req.body.userId
                    }
                ).exec();

                this.res.locals.userId = this.req.body.userId;
                this.res.locals.password = '';
                this.res.locals.language = this.req.body.language;
                this.res.locals.remember = this.req.body.remember;

                if (preCustomer === null) {
                    this.res.locals.validation = [
                        { msg: this.req.__('Message.invalid{{fieldName}}', { fieldName: this.req.__('Form.FieldName.password') }) }
                    ];
                    this.res.render('preCustomer/auth/login');
                    return;
                }

                // パスワードチェック
                if (preCustomer.get('password_hash') !== Util.createHash(this.req.body.password, preCustomer.get('password_salt'))) {
                    this.res.locals.validation = [
                        { msg: this.req.__('Message.invalid{{fieldName}}', { fieldName: this.req.__('Form.FieldName.password') }) }
                    ];
                    this.res.render('preCustomer/auth/login');
                    return;
                }

                // ログイン記憶
                if (this.req.body.remember === 'on') {
                    // トークン生成
                    const authentication = await Models.Authentication.create(
                        {
                            token: Util.createToken(),
                            pre_customer: preCustomer.get('_id'),
                            locale: this.req.body.language
                        }
                    );
                    // tslint:disable-next-line:no-cookies
                    this.res.cookie(
                        'remember_pre_customer',
                        authentication.get('token'), { path: '/', httpOnly: true, maxAge: 604800000 }
                    );
                }

                // ログイン
                (<Express.Session>this.req.session)[PreCustomerUser.AUTH_SESSION_NAME] = preCustomer.toObject();
                (<Express.Session>this.req.session)[PreCustomerUser.AUTH_SESSION_NAME].locale = this.req.body.language;

                const cb = (!_.isEmpty(this.req.query.cb)) ? this.req.query.cb : '/pre/reserve/start';
                this.res.redirect(cb);
            } catch (error) {
                this.next(new Error(this.req.__('Message.UnexpectedError')));
            }

        } else {
            this.res.locals.userId = '';
            this.res.locals.password = '';

            this.res.render('preCustomer/auth/login');
        }
    }

    public async logout(): Promise<void> {
        try {
            if (this.req.session === undefined) {
                this.next(new Error(this.req.__('Message.UnexpectedError')));
                return;
            }

            delete this.req.session[PreCustomerUser.AUTH_SESSION_NAME];

            await Models.Authentication.remove({ token: this.req.cookies.remember_pre_customer }).exec();
            this.res.clearCookie('remember_pre_customer');
            this.res.redirect('/pre/reserve/start');
        } catch (error) {
            this.next(error);
        }
    }
}
