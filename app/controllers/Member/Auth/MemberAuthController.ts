import {Models} from '@motionpicture/ttts-domain';
import * as conf from 'config';
import * as moment from 'moment';
import Util from '../../../../common/Util/Util';
import memberLoginForm from '../../../forms/member/memberLoginForm';
import MemberUser from '../../../models/User/MemberUser';
import BaseController from '../../BaseController';

export default class MemberAuthController extends BaseController {
    public layout = 'layouts/member/layout';

    /**
     * メルマガ会員ログイン
     */
    public login(): void {
        // 期限指定
        const now = moment();
        if (now < moment(conf.get<string>('datetimes.reservation_start_members')) || moment(conf.get<string>('datetimes.reservation_end_members')) < now) {
            return this.next(new Error(this.req.__('Message.OutOfTerm')));
        }

        if (this.req.memberUser.isAuthenticated()) {
            return this.res.redirect(this.router.build('member.reserve.start'));
        }

        if (this.req.method === 'POST') {
            memberLoginForm(this.req, this.res, (err) => {
                if (this.req.form.isValid) {
                    // ユーザー認証
                    this.logger.debug('finding member... user_id:', this.req.form['userId']);
                    Models.Member.findOne(
                        {
                            user_id: this.req.form['userId']
                        },
                        (err, member) => {
                            if (err) return this.next(new Error(this.req.__('Message.UnexpectedError')));

                            if (!member) {
                                this.req.form.errors.push('ログイン番号またはパスワードに誤りがあります');
                                this.res.render('member/auth/login');
                            } else {
                                // パスワードチェック
                                if (member.get('password_hash') !== Util.createHash(this.req.form['password'], member.get('password_salt'))) {
                                    this.req.form.errors.push('ログイン番号またはパスワードに誤りがあります');
                                    this.res.render('member/auth/login');
                                } else {
                                    // ログイン
                                    this.req.session[MemberUser.AUTH_SESSION_NAME] = member.toObject();
                                    this.res.redirect(this.router.build('member.reserve.start'));
                                }
                            }
                        }
                    );
                } else {
                    this.res.render('member/auth/login');
                }
            });
        } else {
            this.res.locals.userId = '';
            this.res.locals.password = '';

            this.res.render('member/auth/login');
        }
    }
}
