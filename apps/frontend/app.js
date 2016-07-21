"use strict";
var express = require('express');
var partials = require('express-partials');
var useragent = require('express-useragent');
var path = require('path');
var favicon = require('serve-favicon');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var multer = require('multer');
var logger_1 = require('./middlewares/logger');
var benchmarks_1 = require('./middlewares/benchmarks');
var session_1 = require('./middlewares/session');
var MemberUser_1 = require('./models/User/MemberUser');
var StaffUser_1 = require('./models/User/StaffUser');
var SponsorUser_1 = require('./models/User/SponsorUser');
var router_1 = require('./routes/router');
var conf = require('config');
var mongoose = require('mongoose');
var i18n = require('i18n');
var app = express();
app.use(partials()); // レイアウト&パーシャルサポート
app.use(useragent.express()); // ユーザーエージェント
app.use(logger_1.default); // ロガー
app.use(benchmarks_1.default); // ベンチマーク的な
app.use(session_1.default); // セッション
// view engine setup
app.set('views', __dirname + "/views");
app.set('view engine', 'ejs');
// uncomment after placing your favicon in /public
app.use(favicon(path.join(__dirname, '../../public', 'favicon.ico')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
// for parsing multipart/form-data
var storage = multer.memoryStorage();
app.use(multer({ storage: storage }).any());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '/../../public')));
// i18n を利用する設定
i18n.configure({
    locales: ['en', 'ja'],
    defaultLocale: 'en',
    directory: __dirname + '/../../locales',
    objectNotation: true
});
// i18n の設定を有効化
app.use(i18n.init);
// セッションで言語管理
app.use(function (req, res, next) {
    if (req.session['locale']) {
        req.setLocale(req.session['locale']);
    }
    next();
});
// ユーザー認証
app.use(function (req, res, next) {
    // リクエスト毎にユーザーインスタンスを再生成する
    MemberUser_1.default.deleteInstance();
    var memberUser = MemberUser_1.default.getInstance();
    memberUser.initialize(req.session);
    StaffUser_1.default.deleteInstance();
    var staffUser = StaffUser_1.default.getInstance();
    staffUser.initialize(req.session);
    SponsorUser_1.default.deleteInstance();
    var sponsorUser = SponsorUser_1.default.getInstance();
    sponsorUser.initialize(req.session);
    next();
});
// ルーティング
router_1.default(app);
var MONGOLAB_URI = conf.get('mongolab_uri');
mongoose.connect(MONGOLAB_URI, {});
module.exports = app;
