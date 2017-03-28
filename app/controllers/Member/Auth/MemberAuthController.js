"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chevre_domain_1 = require("@motionpicture/chevre-domain");
const conf = require("config");
const moment = require("moment");
const Util = require("../../../../common/Util/Util");
const memberLoginForm_1 = require("../../../forms/member/memberLoginForm");
const MemberUser_1 = require("../../../models/User/MemberUser");
const BaseController_1 = require("../../BaseController");
/**
 * メルマガ先行会員認証コントローラー
 *
 * @export
 * @class MemberAuthController
 * @extends {BaseController}
 */
class MemberAuthController extends BaseController_1.default {
    constructor() {
        super(...arguments);
        this.layout = 'layouts/member/layout';
    }
    /**
     * メルマガ会員ログイン
     */
    login() {
        // 期限指定
        const now = moment();
        if (now < moment(conf.get('datetimes.reservation_start_members')) || moment(conf.get('datetimes.reservation_end_members')) < now) {
            this.next(new Error(this.req.__('Message.OutOfTerm')));
            return;
        }
        if (this.req.memberUser && this.req.memberUser.isAuthenticated()) {
            this.res.redirect(this.router.build('member.reserve.start'));
            return;
        }
        if (this.req.method === 'POST') {
            memberLoginForm_1.default(this.req, this.res, () => {
                const form = this.req.form;
                if (form && form.isValid) {
                    // ユーザー認証
                    this.logger.debug('finding member... user_id:', form.userId);
                    chevre_domain_1.Models.Member.findOne({
                        user_id: form.userId
                    }, (findMemberErr, member) => {
                        if (findMemberErr)
                            return this.next(new Error(this.req.__('Message.UnexpectedError')));
                        if (!member) {
                            form.errors.push('ログイン番号またはパスワードに誤りがあります');
                            this.res.render('member/auth/login');
                        }
                        else {
                            // パスワードチェック
                            if (member.get('password_hash') !== Util.createHash(form.password, member.get('password_salt'))) {
                                form.errors.push('ログイン番号またはパスワードに誤りがあります');
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
exports.default = MemberAuthController;
