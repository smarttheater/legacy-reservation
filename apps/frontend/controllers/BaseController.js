"use strict";
var log4js = require('log4js');
var moment = require('moment');
var util = require('util');
var MemberUser_1 = require('../models/User/MemberUser');
var StaffUser_1 = require('../models/User/StaffUser');
var SponsorUser_1 = require('../models/User/SponsorUser');
/**
 * ベースコントローラー
 *
 * 基本的にコントローラークラスはルーティングクラスより呼ばれる
 * あらゆるルーティングで実行されるメソッドは、このクラスがベースとなるので、メソッド共通の処理はここで実装するとよい
 */
var BaseController = (function () {
    function BaseController(req, res, next) {
        this.req = req;
        this.res = res;
        this.next = next;
        this.logger = log4js.getLogger('system');
        this.router = this.req.app.namedRoutes;
        this.memberUser = MemberUser_1.default.getInstance();
        this.staffUser = StaffUser_1.default.getInstance();
        this.sponsorUser = SponsorUser_1.default.getInstance();
        // ユーザーインスタンスをテンプレート変数へ渡す
        this.res.locals.memberUser = this.memberUser;
        this.res.locals.staffUser = this.staffUser;
        this.res.locals.sponsorUser = this.sponsorUser;
        this.res.locals.req = this.req;
        this.res.locals.moment = moment;
        this.res.locals.util = util;
    }
    return BaseController;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = BaseController;
