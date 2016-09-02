"use strict";
const BaseController_1 = require('../../BaseController');
const Util_1 = require('../../../../common/Util/Util');
const Models_1 = require('../../../../common/models/Models');
const moment = require('moment');
const memberLoginForm_1 = require('../../../forms/member/memberLoginForm');
const MemberUser_1 = require('../../../models/User/MemberUser');
const conf = require('config');
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
        let now = moment();
        if (now < moment(conf.get('datetimes.reservation_start_members')) || moment(conf.get('datetimes.reservation_end_members')) < now) {
            return this.next(new Error('Message.Expired'));
        }
        if (this.req.memberUser.isAuthenticated()) {
            return this.res.redirect(this.router.build('member.reserve.start'));
        }
        if (this.req.method === 'POST') {
            memberLoginForm_1.default(this.req, this.res, (err) => {
                if (this.req.form.isValid) {
                    // ユーザー認証
                    this.logger.debug('finding member... user_id:', this.req.form['userId']);
                    Models_1.default.Member.findOne({
                        user_id: this.req.form['userId']
                    }, (err, member) => {
                        if (err)
                            return this.next(new Error(this.req.__('Message.UnexpectedError')));
                        if (!member) {
                            this.req.form.errors.push('ログイン番号またはパスワードに誤りがあります');
                            this.res.render('member/auth/login');
                        }
                        else {
                            // パスワードチェック
                            if (member.get('password_hash') !== Util_1.default.createHash(this.req.form['password'], member.get('password_salt'))) {
                                this.req.form.errors.push('ログイン番号またはパスワードに誤りがあります');
                                this.res.render('member/auth/login');
                            }
                            else {
                                // ログイン
                                this.req.session[MemberUser_1.default.AUTH_SESSION_NAME] = member.toObject();
                                this.res.redirect(this.router.build('member.reserve.start'));
                            }
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
