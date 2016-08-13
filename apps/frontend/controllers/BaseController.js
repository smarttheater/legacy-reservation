"use strict";
const log4js = require('log4js');
const moment = require('moment');
const util = require('util');
const MvtkUser_1 = require('../models/User/MvtkUser');
const MemberUser_1 = require('../models/User/MemberUser');
const StaffUser_1 = require('../models/User/StaffUser');
const SponsorUser_1 = require('../models/User/SponsorUser');
const WindowUser_1 = require('../models/User/WindowUser');
/**
 * ベースコントローラー
 *
 * 基本的にコントローラークラスはルーティングクラスより呼ばれる
 * あらゆるルーティングで実行されるメソッドは、このクラスがベースとなるので、メソッド共通の処理はここで実装するとよい
 */
class BaseController {
    constructor(req, res, next) {
        this.req = req;
        this.res = res;
        this.next = next;
        this.logger = log4js.getLogger('system');
        this.router = this.req.app.namedRoutes;
        this.mvtkUser = MvtkUser_1.default.getInstance();
        this.memberUser = MemberUser_1.default.getInstance();
        this.staffUser = StaffUser_1.default.getInstance();
        this.sponsorUser = SponsorUser_1.default.getInstance();
        this.windowUser = WindowUser_1.default.getInstance();
        // ユーザーインスタンスをテンプレート変数へ渡す
        this.res.locals.mvtkUser = this.mvtkUser;
        this.res.locals.memberUser = this.memberUser;
        this.res.locals.staffUser = this.staffUser;
        this.res.locals.sponsorUser = this.sponsorUser;
        this.res.locals.windowUser = this.windowUser;
        this.res.locals.req = this.req;
        this.res.locals.moment = moment;
        this.res.locals.util = util;
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = BaseController;
