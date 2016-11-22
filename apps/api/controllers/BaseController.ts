import express = require('express');
import Log4js = require('log4js');
import Moment = require('moment');

/**
 * ベースコントローラー
 */
export default class BaseController {
    /** httpリクエストオブジェクト */
    public req: express.Request;
    /** httpレスポンスオブジェクト */
    public res: express.Response;
    /** 次に一致するルートメソッド */
    public next: express.NextFunction;
    /** ロガー */
    public logger: Log4js.Logger;
    /** ルーティング */
    public router: Express.NamedRoutes;

    constructor(req: express.Request, res: express.Response, next: express.NextFunction) {
        this.req = req;
        this.res = res;
        this.next = next;

        this.router = this.req.app.namedRoutes;

        // URLパラメータで言語管理
        if (this.req.params.locale) {
            this.req.setLocale(req.params.locale);
        }

        let log4js: typeof Log4js = require('log4js');
        this.logger = log4js.getLogger('system');
        let moment: typeof Moment = require('moment');
        this.res.locals.moment = moment;
    }
}
