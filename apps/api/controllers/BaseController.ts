import express = require('express');
import log4js = require('log4js');
import moment = require('moment');
import util = require('util');

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
     * ルーティング
     */
    public router: Express.NamedRoutes;

    constructor(req: express.Request, res: express.Response, next: express.NextFunction) {
        this.req = req;
        this.res = res;
        this.next = next;

        this.logger = log4js.getLogger('system');
        this.router = this.req.app.namedRoutes;


        // URLパラメータで言語管理
        if (this.req.params.locale) {
            this.req.setLocale(req.params.locale);
        }


        this.res.locals.req = this.req;
        this.res.locals.moment = moment;
        this.res.locals.util = util;
    }
}
