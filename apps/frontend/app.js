"use strict";
const express = require('express');
const partials = require('express-partials');
const useragent = require('express-useragent');
const path = require('path');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const multer = require('multer');
const logger_1 = require('./middlewares/logger');
const benchmarks_1 = require('./middlewares/benchmarks');
const session_1 = require('./middlewares/session');
const conf = require('config');
const mongoose = require('mongoose');
const i18n = require('i18n');
const log4js = require('log4js');
let app = express();
app.use(partials()); // レイアウト&パーシャルサポート
app.use(useragent.express()); // ユーザーエージェント
app.use(logger_1.default); // ロガー
app.use(benchmarks_1.default); // ベンチマーク的な
app.use(session_1.default); // セッション
// ペイデザイン連携のため
// TODO 後で消す
app.use((req, res, next) => {
    if (req.originalUrl === '/PayDesign/reserve/notify') {
        let logger = log4js.getLogger('system');
        logger.debug('req:', req);
        logger.debug('req.body:', req.body);
    }
    next();
});
// view engine setup
app.set('views', `${__dirname}/views`);
app.set('view engine', 'ejs');
// uncomment after placing your favicon in /public
// app.use(favicon(path.join(__dirname, '../../public', 'favicon.ico')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
// for parsing multipart/form-data
let storage = multer.memoryStorage();
app.use(multer({ storage: storage }).any());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '/../../public')));
// i18n を利用する設定
i18n.configure({
    locales: ['en', 'ja'],
    defaultLocale: 'ja',
    directory: __dirname + '/../../locales',
    objectNotation: true
});
// i18n の設定を有効化
app.use(i18n.init);
// セッションで言語管理
app.use((req, res, next) => {
    if (req.session['locale']) {
        req.setLocale(req.session['locale']);
    }
    next();
});
// ルーティング
const NamedRoutes = require('named-routes');
const member_1 = require('./routes/member');
const sponsor_1 = require('./routes/sponsor');
const staff_1 = require('./routes/staff');
const tel_1 = require('./routes/tel');
const window_1 = require('./routes/window');
const router_1 = require('./routes/router');
let namedRoutes = new NamedRoutes();
namedRoutes.extendExpress(app);
namedRoutes.registerAppHelpers(app);
// ルーティング登録の順序に注意！
member_1.default(app);
sponsor_1.default(app);
staff_1.default(app);
tel_1.default(app);
window_1.default(app);
router_1.default(app);
let MONGOLAB_URI = conf.get('mongolab_uri');
mongoose.connect(MONGOLAB_URI, {});
module.exports = app;
