import BaseController from '../../BaseController';
import SponsorUser from '../../../models/User/SponsorUser';
import sponsorLoginForm from '../../../forms/sponsor/sponsorLoginForm';
import Util from '../../../../common/Util/Util';
import Constants from '../../../../common/Util/Constants';
import Models from '../../../../common/models/Models';
import moment = require('moment');
import memberLoginForm from '../../../forms/member/memberLoginForm';
import ReservationUtil from '../../../../common/models/Reservation/ReservationUtil';
import MemberUser from '../../../models/User/MemberUser';
import conf = require('config');

export default class MemberAuthController extends BaseController {
    public layout = 'layouts/member/layout';

    /**
     * メルマガ会員ログイン
     */
    public login(): void {
        // 期限指定
        let now = moment();
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
