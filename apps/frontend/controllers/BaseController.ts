import express = require('express');
import log4js = require('log4js');
import moment = require('moment');
import util = require('util');

import MvtkUser from '../models/User/MvtkUser';
import MemberUser from '../models/User/MemberUser';
import StaffUser from '../models/User/StaffUser';
import SponsorUser from '../models/User/SponsorUser';
import NamedRoutes = require('named-routes');

/**
 * ベースコントローラー
 * 
 * 基本的にコントローラークラスはルーティングクラスより呼ばれる
 * あらゆるルーティングで実行されるメソッドは、このクラスがベースとなるので、メソッド共通の処理はここで実装するとよい
 */
export default class BaseController
{
    /** httpリクエストオブジェクト */
    public req: express.Request;

    /**httpレスポンスオブジェクト */

    public res: express.Response;

    /** 次に一致するルートメソッド */
    public next: express.NextFunction;

    /** ロガー */
    public logger: log4js.Logger;

    /** ムビチケユーザー */
    public mvtkUser: MvtkUser;
    /** メルマガ会員先行ユーザー */
    public memberUser: MemberUser;
    /** 内部関係者ユーザー */
    public staffUser: StaffUser;
    /** 外部関係者ユーザー */
    public sponsorUser: SponsorUser;

    /** ルーティング */
    public router: Express.NamedRoutes;

    constructor(req: express.Request, res: express.Response, next: express.NextFunction) {
        this.req = req;
        this.res = res;
        this.next = next;

        this.logger = log4js.getLogger('system');
        this.router = this.req.app.namedRoutes;


        this.mvtkUser = MvtkUser.getInstance();
        this.memberUser = MemberUser.getInstance();
        this.staffUser = StaffUser.getInstance();
        this.sponsorUser = SponsorUser.getInstance();

        // ユーザーインスタンスをテンプレート変数へ渡す
        this.res.locals.mvtkUser = this.mvtkUser;
        this.res.locals.memberUser = this.memberUser;
        this.res.locals.staffUser = this.staffUser;
        this.res.locals.sponsorUser = this.sponsorUser;

        this.res.locals.req = this.req;
        this.res.locals.moment = moment;
        this.res.locals.util = util;
    }
}
