import BaseController from '../../BaseController';
import SponsorUser from '../../../models/User/SponsorUser';
import sponsorLoginForm from '../../../forms/Sponsor/sponsorLoginForm';
import Util from '../../../../common/Util/Util';
import Constants from '../../../../common/Util/Constants';
import Models from '../../../../common/models/Models';
import moment = require('moment');
import memberReserveLoginForm from '../../../forms/Member/Reserve/memberReserveLoginForm';
import ReservationUtil from '../../../../common/models/Reservation/ReservationUtil';
import MemberUser from '../../../models/User/MemberUser';

export default class MemberAuthController extends BaseController {
    public layout = 'layouts/member/layout';

    /**
     * メルマガ会員ログイン
     */
    public login(): void {
        // 期限指定
        if (process.env.NODE_ENV === 'prod') {
            let now = moment();
            if (now < moment(Constants.RESERVE_START_DATETIME) || moment(Constants.RESERVE_END_DATETIME) < now) {
                return this.next(new Error('Message.Expired'));
            }
        }

        if (this.req.memberUser.isAuthenticated()) {
            return this.res.redirect(this.router.build('member.reserve.start'));
        }

        if (this.req.method === 'POST') {
            memberReserveLoginForm(this.req, this.res, (err) => {
                if (this.req.form.isValid) {
                    // ユーザー認証
                    this.logger.debug('finding member... user_id:', this.req.form['userId']);
                    Models.Member.findOne(
                        {
                            user_id: this.req.form['userId'],
                            password: this.req.form['password'],
                        },
                        (err, member) => {
                            if (err) return this.next(new Error(this.req.__('Message.UnexpectedError')));

                            if (!member) {
                                this.req.form.errors.push('ログイン番号またはパスワードに誤りがあります');
                                this.res.render('member/reserve/terms');
                            } else {
                                // 予約の有無を確認
                                Models.Reservation.count(
                                    {
                                        member: member.get('_id'),
                                        purchaser_group: ReservationUtil.PURCHASER_GROUP_MEMBER,
                                        status: ReservationUtil.STATUS_KEPT_BY_MEMBER
                                    },
                                    (err, count) => {
                                        if (err) return this.next(new Error(this.req.__('Message.UnexpectedError')));

                                        if (count === 0) {
                                            this.req.form.errors.push('既に購入済みです');
                                            this.res.render('member/auth/login');
                                        } else {
                                            // ログイン
                                            this.req.session[MemberUser.AUTH_SESSION_NAME] = member.toObject();
                                            this.res.redirect(this.router.build('member.reserve.start'));
                                        }
                                    }
                                );
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
