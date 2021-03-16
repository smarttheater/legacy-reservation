"use strict";
/**
 * expressアプリケーション
 */
const middlewares = require("@motionpicture/express-middleware");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const express = require("express");
// tslint:disable-next-line:no-require-imports
const partials = require("express-partials");
const expressValidator = require("express-validator");
const i18n = require("i18n");
const multer = require("multer");
const favicon = require("serve-favicon");
const locales_1 = require("./factory/locales");
const errorHandler_1 = require("./middlewares/errorHandler");
const notFoundHandler_1 = require("./middlewares/notFoundHandler");
const session_1 = require("./middlewares/session");
const setLocals_1 = require("./middlewares/setLocals");
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
    locales: Object.keys(locales_1.locales),
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
    var _a, _b, _c;
    // セッションで言語管理
    if (typeof ((_a = req.session) === null || _a === void 0 ? void 0 : _a.locale) === 'string' && req.session.locale.length > 0) {
        req.setLocale(req.session.locale);
    }
    if (typeof ((_b = req.query) === null || _b === void 0 ? void 0 : _b.locale) === 'string' && req.query.locale.length > 0) {
        req.setLocale(req.query.locale);
        req.session.locale = req.query.locale;
    }
    // add 2017/06/20 set default locale
    if (typeof ((_c = req.session) === null || _c === void 0 ? void 0 : _c.locale) !== 'string' || req.session.locale.length === 0) {
        req.session.locale = 'ja';
    }
    next();
});
app.use(expressValidator()); // バリデーション
app.use(setLocals_1.default); // ローカル変数セット
app.use('/', router_1.default);
// 404
app.use(notFoundHandler_1.default);
// error handlers
app.use(errorHandler_1.default);
module.exports = app;
