import express = require('express');
import log4js = require('log4js');
import moment = require('moment');
import util = require('util');
import User from '../models/User';
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
    public user: User;

    /**
     * ルーティングクラスインスタンス
     */
    public router: NamedRoutes.INamedRoutes;

    constructor(req: express.Request, res: express.Response, next: express.NextFunction) {
        this.req = req;
        this.res = res;
        this.next = next;

        this.logger = log4js.getLogger('system');
        this.user = User.getInstance();
        this.router = Router.getInstance().getRouter();

        // ユーザーインスタンスをテンプレート変数へ渡す
        this.res.locals.user = this.user;

        this.res.locals.req = this.req;
        this.res.locals.moment = moment;
        this.res.locals.util = util;


        // メタタグ情報を設定ファイルから読み込んで、テンプレート変数へ渡す
        this.res.locals.metas = null;

        let fs = require('fs-extra');
        let metaInfosFile = `${__dirname}/../routes/metas.json`;
        let metaInfosJson = fs.readFileSync(metaInfosFile);
        try {
            let metaInfos = JSON.parse(metaInfosJson);
            if (metaInfos.hasOwnProperty(this.req.route.name)) {
                this.res.locals.metas = metaInfos[this.req.route.name];
            }
        } catch (error) {
        }
    }
}
