import * as conf from 'config';
import * as express from 'express';
import * as log4js from 'log4js';
import * as moment from 'moment';
import * as numeral from 'numeral';
import Util from '../../common/Util/Util';

/**
 * ベースコントローラー
 *
 * 基本的にコントローラークラスはルーティングクラスより呼ばれる
 * あらゆるルーティングで実行されるメソッドは、このクラスがベースとなるので、メソッド共通の処理はここで実装するとよい
 */
export default class BaseController {
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

    /**
     * レイアウトファイル
     */
    public layout: string;

    constructor(req: express.Request, res: express.Response, next: express.NextFunction) {
        this.req = req;
        this.res = res;
        this.next = next;

        this.logger = log4js.getLogger('system');
        this.router = this.req.app.namedRoutes;

        this.res.locals.req = this.req;
        this.res.locals.moment = moment;
        this.res.locals.numeral = numeral;
        this.res.locals.conf = conf;
        this.res.locals.Util = Util;

        // レイアウト指定があれば変更
        const render = this.res.render;
        this.res.render = (view: string, options?: any, cb?: (err: Error, html: string) => void) => {
            if (this.layout) {
                if (options === undefined) {
                    options = {};
                } else if (typeof options === 'function') {
                    cb = options;
                    options = {};
                }

                if (!options.hasOwnProperty('layout')) {
                    options.layout = this.layout;
                }
            }

            render(view, options, cb);
        };
    }
}
