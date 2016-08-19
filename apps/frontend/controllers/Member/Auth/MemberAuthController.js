"use strict";
const BaseController_1 = require('../../BaseController');
const Constants_1 = require('../../../../common/Util/Constants');
const Models_1 = require('../../../../common/models/Models');
const moment = require('moment');
const memberReserveLoginForm_1 = require('../../../forms/Member/Reserve/memberReserveLoginForm');
const ReservationUtil_1 = require('../../../../common/models/Reservation/ReservationUtil');
const MemberUser_1 = require('../../../models/User/MemberUser');
class MemberAuthController extends BaseController_1.default {
    constructor(...args) {
        super(...args);
        this.layout = 'layouts/member/layout';
    }
    /**
     * メルマガ会員ログイン
     */
    login() {
        // 期限指定
        if (process.env.NODE_ENV === 'prod') {
            let now = moment();
            if (now < moment(Constants_1.default.RESERVE_START_DATETIME) || moment(Constants_1.default.RESERVE_END_DATETIME) < now) {
                return this.next(new Error('Message.Expired'));
            }
        }
        if (this.req.memberUser.isAuthenticated()) {
            return this.res.redirect(this.router.build('member.reserve.start'));
        }
        if (this.req.method === 'POST') {
            memberReserveLoginForm_1.default(this.req, this.res, (err) => {
                if (this.req.form.isValid) {
                    // ユーザー認証
                    this.logger.debug('finding member... user_id:', this.req.form['userId']);
                    Models_1.default.Member.findOne({
                        user_id: this.req.form['userId'],
                        password: this.req.form['password'],
                    }, (err, member) => {
                        if (err)
                            return this.next(new Error(this.req.__('Message.UnexpectedError')));
                        if (!member) {
                            this.req.form.errors.push('ログイン番号またはパスワードに誤りがあります');
                            this.res.render('member/reserve/terms');
                        }
                        else {
                            // 予約の有無を確認
                            Models_1.default.Reservation.count({
                                member: member.get('_id'),
                                purchaser_group: ReservationUtil_1.default.PURCHASER_GROUP_MEMBER,
                                status: ReservationUtil_1.default.STATUS_KEPT_BY_MEMBER
                            }, (err, count) => {
                                if (err)
                                    return this.next(new Error(this.req.__('Message.UnexpectedError')));
                                if (count === 0) {
                                    this.req.form.errors.push('既に購入済みです');
                                    this.res.render('member/auth/login');
                                }
                                else {
                                    // ログイン
                                    this.req.session[MemberUser_1.default.AUTH_SESSION_NAME] = member.toObject();
                                    this.res.redirect(this.router.build('member.reserve.start'));
                                }
                            });
                        }
                    });
                }
                else {
                    this.res.render('member/auth/login');
                }
            });
        }
        else {
            this.res.locals.userId = '';
            this.res.locals.password = '';
            this.res.render('member/auth/login');
        }
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = MemberAuthController;
