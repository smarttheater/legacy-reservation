/**
 * expressアプリケーション
 */
import * as middlewares from '@motionpicture/express-middleware';
import * as bodyParser from 'body-parser';
import * as cookieParser from 'cookie-parser';
import * as express from 'express';
// tslint:disable-next-line:no-require-imports
import partials = require('express-partials');
import * as expressValidator from 'express-validator';
import * as i18n from 'i18n';
import * as multer from 'multer';
import * as favicon from 'serve-favicon';

import { locales } from './factory/locales';

import errorHandler from './middlewares/errorHandler';
import notFoundHandler from './middlewares/notFoundHandler';
import session from './middlewares/session';
import setLocals from './middlewares/setLocals';

import router from './routes/router';

const app = express();

app.use(middlewares.basicAuth({ // ベーシック認証
    name: process.env.BASIC_AUTH_NAME,
    pass: process.env.BASIC_AUTH_PASS
}));

app.use(partials()); // レイアウト&パーシャルサポート
app.use(session); // セッション

// view engine setup
app.set('views', `${__dirname}/../../views`);
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
app.use(favicon(`${__dirname}/../../public/favicon.ico`));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// for parsing multipart/form-data
const storage = multer.memoryStorage();
app.use(multer({ storage: storage }).any());

app.use(cookieParser());
app.use(express.static(`${__dirname}/../../public`));

// i18n を利用する設定
i18n.configure({
    locales: Object.keys(locales),
    defaultLocale: 'ja',
    directory: `${__dirname}/../../locales`,
    objectNotation: true,
    updateFiles: false // ページのビューで自動的に言語ファイルを更新しない
});
// i18n の設定を有効化
app.use(i18n.init);

// セッションで言語管理
// tslint:disable-next-line:variable-name
app.use((req, _res, next) => {
    // セッションで言語管理
    if (typeof req.session?.locale === 'string' && req.session.locale.length > 0) {
        req.setLocale(req.session.locale);
    }

    if (typeof req.query?.locale === 'string' && req.query.locale.length > 0) {
        req.setLocale(req.query.locale);
        (<any>req.session).locale = req.query.locale;
    }

    // add 2017/06/20 set default locale
    if (typeof req.session?.locale !== 'string' || req.session.locale.length === 0) {
        (<any>req.session).locale = 'ja';
    }

    next();
});

app.use(expressValidator()); // バリデーション

app.use(setLocals); // ローカル変数セット

app.use('/', router);

// 404
app.use(notFoundHandler);

// error handlers
app.use(errorHandler);

export = app;
