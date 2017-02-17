"use strict";
/**
 * expressアプリケーション
 *
 * @module app
 * @global
 */
const bodyParser = require("body-parser");
const conf = require("config");
const cookieParser = require("cookie-parser");
const express = require("express");
// tslint:disable-next-line:no-require-imports
const partials = require("express-partials");
const i18n = require("i18n");
const mongoose = require("mongoose");
const multer = require("multer");
const favicon = require("serve-favicon");
const basicAuth_1 = require("./middlewares/basicAuth");
const benchmarks_1 = require("./middlewares/benchmarks");
const logger_1 = require("./middlewares/logger");
const session_1 = require("./middlewares/session");
const app = express();
app.use(partials()); // レイアウト&パーシャルサポート
if (process.env.NODE_ENV === 'dev') {
    app.use(logger_1.default); // ロガー
}
app.use(benchmarks_1.default); // ベンチマーク的な
app.use(session_1.default); // セッション
app.use(basicAuth_1.default); // ベーシック認証
// ルーティング
const NamedRoutes = require("named-routes");
const customerSupport_1 = require("./routes/customerSupport");
const member_1 = require("./routes/member");
const payDesign_1 = require("./routes/payDesign");
const pre_1 = require("./routes/pre");
const router_1 = require("./routes/router");
const sendGrid_1 = require("./routes/sendGrid");
const sponsor_1 = require("./routes/sponsor");
const staff_1 = require("./routes/staff");
const tel_1 = require("./routes/tel");
const window_1 = require("./routes/window");
const namedRoutes = new NamedRoutes();
namedRoutes.extendExpress(app);
namedRoutes.registerAppHelpers(app);
if (process.env.NODE_ENV !== 'prod') {
    // サーバーエラーテスト
    app.get('/500', (req) => {
        // req.on('data', (chunk) => {
        // });
        req.on('end', () => {
            throw new Error('500 manually.');
        });
    });
}
// ペイデザイン連携のため
payDesign_1.default(app);
// view engine setup
app.set('views', `${__dirname}/views`);
app.set('view engine', 'ejs');
// uncomment after placing your favicon in /public
app.use(favicon(__dirname + '/../public/favicon.ico'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
// for parsing multipart/form-data
const storage = multer.memoryStorage();
app.use(multer({ storage: storage }).any());
app.use(cookieParser());
app.use(express.static(__dirname + '/../public'));
// i18n を利用する設定
i18n.configure({
    locales: ['en', 'ja'],
    defaultLocale: 'ja',
    directory: __dirname + '/../locales',
    objectNotation: true,
    updateFiles: false // ページのビューで自動的に言語ファイルを更新しない
});
// i18n の設定を有効化
app.use(i18n.init);
// セッションで言語管理
// tslint:disable-next-line:variable-name
app.use((req, _res, next) => {
    if (req.session.locale) {
        req.setLocale(req.session.locale);
    }
    if (req.query.locale) {
        req.setLocale(req.query.locale);
        req.session.locale = req.query.locale;
    }
    next();
});
// ルーティング登録の順序に注意！
member_1.default(app);
sponsor_1.default(app);
staff_1.default(app);
tel_1.default(app);
window_1.default(app);
customerSupport_1.default(app);
pre_1.default(app);
sendGrid_1.default(app);
router_1.default(app);
/*
 * Mongoose by default sets the auto_reconnect option to true.
 * We recommend setting socket options at both the server and replica set level.
 * We recommend a 30 second connection timeout because it allows for
 * plenty of time in most operating environments.
 */
const MONGOLAB_URI = conf.get('mongolab_uri');
// Use native promises
mongoose.Promise = global.Promise;
mongoose.connect(MONGOLAB_URI, {
    server: { socketOptions: { keepAlive: 300000, connectTimeoutMS: 30000 } },
    replset: { socketOptions: { keepAlive: 300000, connectTimeoutMS: 30000 } }
});
module.exports = app;
