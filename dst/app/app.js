"use strict";
/**
 * expressアプリケーション
 */
const middlewares = require("@motionpicture/express-middleware");
const bodyParser = require("body-parser");
const conf = require("config");
const cookieParser = require("cookie-parser");
const express = require("express");
// tslint:disable-next-line:no-require-imports
const partials = require("express-partials");
const expressValidator = require("express-validator");
const i18n = require("i18n");
const multer = require("multer");
const favicon = require("serve-favicon");
const errorHandler_1 = require("./middlewares/errorHandler");
const notFoundHandler_1 = require("./middlewares/notFoundHandler");
const session_1 = require("./middlewares/session");
const setLocals_1 = require("./middlewares/setLocals");
const api_1 = require("./routes/api");
const customer_1 = require("./routes/customer");
const entrance_1 = require("./routes/entrance");
const router_1 = require("./routes/router");
const app = express();
app.use(middlewares.basicAuth({
    name: process.env.BASIC_AUTH_NAME,
    pass: process.env.BASIC_AUTH_PASS
}));
app.use(partials()); // レイアウト&パーシャルサポート
app.use(session_1.default); // セッション
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
    locales: Object.keys(conf.get('locales')),
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
    if (typeof req.session.locale === 'string' && req.session.locale.length > 0) {
        req.setLocale(req.session.locale);
    }
    if (typeof req.query.locale === 'string' && req.query.locale.length > 0) {
        req.setLocale(req.query.locale);
        req.session.locale = req.query.locale;
    }
    next();
});
app.use(expressValidator()); // バリデーション
app.use(setLocals_1.default); // ローカル変数セット
// ルーティング登録の順序に注意！
app.use('/api', api_1.default);
app.use('/customer', customer_1.default);
app.use('/entrance', entrance_1.default);
app.use('/', router_1.default);
// 404
app.use(notFoundHandler_1.default);
// error handlers
app.use(errorHandler_1.default);
module.exports = app;
