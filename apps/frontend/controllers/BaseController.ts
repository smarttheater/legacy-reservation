import express = require('express');
import log4js = require('log4js');
import moment = require('moment');
import util = require('util');
import conf = require('config');
import mongoose = require('mongoose');

import StaffUser from '../models/User/StaffUser';
import SponsorUser from '../models/User/SponsorUser';
import Router from '../routes/router';
import NamedRoutes = require('named-routes');

/**
 * ベースコントローラー
 * 
 * 基本的にコントローラークラスはルーティングクラスより呼ばれる
 * あらゆるルーティングで実行されるメソッドは、このクラスがベースとなるので、メソッド共通の処理はここで実装するとよい
 */
export default class BaseController
{
    /**
     * httpリクエストオブジェクト
     */
    public req: express.Request;

    /**
     * httpレスポンスオブジェクト
     */

    public res: express.Response;

    /**
     * 次に一致するルートメソッド
     */
    public next: express.NextFunction;

    /**
     * ロガー
     */
    public logger: log4js.Logger;

    /**
     * ユーザーインスタンス
     */
    public staffUser: StaffUser;
    public sponsorUser: SponsorUser;

    /**
     * ルーティングクラスインスタンス
     */
    public router: NamedRoutes.INamedRoutes;

    constructor(req: express.Request, res: express.Response, next: express.NextFunction) {
        this.req = req;
        this.res = res;
        this.next = next;

        this.logger = log4js.getLogger('system');
        this.sponsorUser = SponsorUser.getInstance();
        this.router = Router.getInstance().getRouter();

        // ユーザーインスタンスをテンプレート変数へ渡す
        this.res.locals.staffUser = this.staffUser;
        this.res.locals.sponsorUser = this.sponsorUser;

        this.res.locals.req = this.req;
        this.res.locals.moment = moment;
        this.res.locals.util = util;
    }

    /**
     * mongooseを使用する
     * デフォルトコネクションを開く
     */
    protected useMongoose(cb: () => void): void {
        let MONGOLAB_URI = conf.get<string>('mongolab_uri');
        mongoose.connect(MONGOLAB_URI, {}, (err) => {
            if (err) {
                // TODO どう対処する？
                throw err;
            } else {
                cb();
            }
        });
    }
}
