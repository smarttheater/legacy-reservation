import express = require('express');
import partials = require('express-partials');
import useragent = require('express-useragent');
import path = require('path');
import favicon = require('serve-favicon');
import cookieParser = require('cookie-parser');
import bodyParser = require('body-parser');
import multer = require('multer');
import logger from './middlewares/logger';
import benchmarks from './middlewares/benchmarks';
import session from './middlewares/session';
import MvtkUser from './models/User/MvtkUser';
import MemberUser from './models/User/MemberUser';
import StaffUser from './models/User/StaffUser';
import SponsorUser from './models/User/SponsorUser';
import WindowUser from './models/User/WindowUser';
import router from './routes/router';
import conf = require('config');
import mongoose = require('mongoose');
import i18n = require('i18n');
import mvtkService = require('@motionpicture/mvtk-service');

let app = express();

app.use(partials()); // レイアウト&パーシャルサポート
app.use(useragent.express()); // ユーザーエージェント
app.use(logger); // ロガー
app.use(benchmarks); // ベンチマーク的な
app.use(session); // セッション

// view engine setup
app.set('views', `${__dirname}/views`);
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
// app.use(favicon(path.join(__dirname, '../../public', 'favicon.ico')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// for parsing multipart/form-data
let storage = multer.memoryStorage()
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
    MvtkUser.deleteInstance();
    let mvtkUser = MvtkUser.getInstance();
    mvtkUser.initialize(req.session);

    MemberUser.deleteInstance();
    let memberUser = MemberUser.getInstance();
    memberUser.initialize(req.session);

    StaffUser.deleteInstance();
    let staffUser = StaffUser.getInstance();
    staffUser.initialize(req.session);

    SponsorUser.deleteInstance();
    let sponsorUser = SponsorUser.getInstance();
    sponsorUser.initialize(req.session);

    WindowUser.deleteInstance();
    let windowUser = WindowUser.getInstance();
    windowUser.initialize(req.session);

    next();
});

mvtkService.initialize(conf.get<string>('mvtk_wcf_endpoint'), conf.get<string>('mvtk_wcf2_endpoint'));



// ルーティング
router(app);

let MONGOLAB_URI = conf.get<string>('mongolab_uri');

mongoose.connect(MONGOLAB_URI, {});

export = app;
