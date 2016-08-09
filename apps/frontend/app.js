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
const MvtkUser_1 = require('./models/User/MvtkUser');
const MemberUser_1 = require('./models/User/MemberUser');
const StaffUser_1 = require('./models/User/StaffUser');
const SponsorUser_1 = require('./models/User/SponsorUser');
const router_1 = require('./routes/router');
const conf = require('config');
const mongoose = require('mongoose');
const i18n = require('i18n');
const mvtkService = require('@motionpicture/mvtk-service');
let app = express();
app.use(partials()); // レイアウト&パーシャルサポート
app.use(useragent.express()); // ユーザーエージェント
app.use(logger_1.default); // ロガー
app.use(benchmarks_1.default); // ベンチマーク的な
app.use(session_1.default); // セッション
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
    defaultLocale: 'en',
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
// ユーザー認証
app.use((req, res, next) => {
    // リクエスト毎にユーザーインスタンスを再生成する
    MvtkUser_1.default.deleteInstance();
    let mvtkUser = MvtkUser_1.default.getInstance();
    mvtkUser.initialize(req.session);
    MemberUser_1.default.deleteInstance();
    let memberUser = MemberUser_1.default.getInstance();
    memberUser.initialize(req.session);
    StaffUser_1.default.deleteInstance();
    let staffUser = StaffUser_1.default.getInstance();
    staffUser.initialize(req.session);
    SponsorUser_1.default.deleteInstance();
    let sponsorUser = SponsorUser_1.default.getInstance();
    sponsorUser.initialize(req.session);
    next();
});
mvtkService.initialize(conf.get('mvtk_wcf_endpoint'), conf.get('mvtk_wcf2_endpoint'));
// ルーティング
router_1.default(app);
let MONGOLAB_URI = conf.get('mongolab_uri');
mongoose.connect(MONGOLAB_URI, {});
module.exports = app;
