"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const chevre_domain_1 = require("@motionpicture/chevre-domain");
const conf = require("config");
const moment = require("moment");
const memberLoginForm_1 = require("../../../forms/member/memberLoginForm");
const member_1 = require("../../../models/user/member");
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
     * @returns {Promise<void>}
     */
    login() {
        return __awaiter(this, void 0, void 0, function* () {
            // 期限指定
            const now = moment();
            const dateStartMemberReservation = moment(conf.get('datetimes.reservation_start_members'));
            const dateEndMemberReservation = moment(conf.get('datetimes.reservation_end_members'));
            if (now < dateStartMemberReservation || dateEndMemberReservation < now) {
                this.next(new Error(this.req.__('Message.OutOfTerm')));
                return;
            }
            if (this.req.memberUser !== undefined && this.req.memberUser.isAuthenticated()) {
                this.res.redirect('/member/reserve/start');
                return;
            }
            if (this.req.method === 'POST') {
                memberLoginForm_1.default(this.req);
                const validationResult = yield this.req.getValidationResult();
                if (!validationResult.isEmpty()) {
                    this.res.locals.userId = this.req.body.userId;
                    this.res.locals.password = '';
                    this.res.locals.validation = validationResult.array();
                    this.res.render('member/auth/login');
                    return;
                }
                try {
                    // ユーザー認証
                    const member = yield chevre_domain_1.Models.Member.findOne({
                        user_id: this.req.body.userId
                    }).exec();
                    this.res.locals.userId = this.req.body.userId;
                    this.res.locals.password = '';
                    if (member === null) {
                        this.res.locals.validation = [{ msg: 'ログイン番号またはパスワードに誤りがあります' }];
                        this.res.render('member/auth/login');
                        return;
                    }
                    // パスワードチェック
                    if (member.get('password_hash') !== chevre_domain_1.CommonUtil.createHash(this.req.body.password, member.get('password_salt'))) {
                        this.res.locals.validation = [{ msg: 'ログイン番号またはパスワードに誤りがあります' }];
                        this.res.render('member/auth/login');
                        return;
                    }
                    // ログイン
                    this.req.session[member_1.default.AUTH_SESSION_NAME] = member.toObject();
                    this.res.redirect('/member/reserve/start');
                    return;
                }
                catch (error) {
                    this.next(new Error(this.req.__('Message.UnexpectedError')));
                    return;
                }
            }
            else {
                this.res.locals.userId = '';
                this.res.locals.password = '';
                this.res.render('member/auth/login');
            }
        });
    }
}
exports.default = MemberAuthController;
