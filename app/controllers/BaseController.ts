import { CommonUtil } from '@motionpicture/chevre-domain';
import * as conf from 'config';
import { NextFunction, Request, Response } from 'express';
import * as log4js from 'log4js';
import * as moment from 'moment';
import * as numeral from 'numeral';
import * as _ from 'underscore';

/**
 * ベースコントローラー
 *
 * 基本的にコントローラークラスはルーティングクラスより呼ばれる
 * あらゆるルーティングで実行されるメソッドは、このクラスがベースとなるので、メソッド共通の処理はここで実装するとよい
 *
 * @export
 * @class BaseController
 */
export default class BaseController {
    /**
     * httpリクエストオブジェクト
     */
    public readonly req: Request;
    /**
     * httpレスポンスオブジェクト
     */
    public readonly res: Response;
    /**
     * 次に一致するルートメソッド
     */
    public readonly next: NextFunction;

    /**
     * ロガー
     */
    public logger: log4js.Logger;

    /**
     * レイアウトファイル
     */
    public layout: string;

    constructor(req: Request, res: Response, next: NextFunction) {
        this.req = req;
        this.res = res;
        this.next = next;

        this.logger = log4js.getLogger('system');

        this.res.locals.req = this.req;
        this.res.locals.moment = moment;
        this.res.locals.numeral = numeral;
        this.res.locals.conf = conf;
        this.res.locals.Util = CommonUtil;
        this.res.locals.validation = null;

        // レイアウト指定があれば変更
        const render = this.res.render;
        this.res.render = (view: string, options?: any, cb?: (err: Error | null, html: string) => void) => {
            if (!_.isEmpty(this.layout)) {
                if (options === undefined) {
                    options = {};
                } else if (typeof options === 'function') {
                    cb = options;
                    options = {};
                }

                if (options.layout === undefined) {
                    options.layout = this.layout;
                }
            }

            render(view, options, cb);
        };
    }
}
