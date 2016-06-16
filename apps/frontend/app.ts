import express = require('express');
import partials = require('express-partials');
import useragent = require('express-useragent');
import path = require('path');
import fs = require('fs');
import favicon = require('serve-favicon');
import cookieParser = require('cookie-parser');
import bodyParser = require('body-parser');
import multer = require('multer');
import logger from './middlewares/logger';
import benchmarks from './middlewares/benchmarks';
import session from './middlewares/session';
import User from './models/User';
import config = require('config');
import Router from './routes/router';

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
app.use(favicon(path.join(__dirname, '../../public', 'favicon.ico')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// for parsing multipart/form-data
let storage = multer.memoryStorage()
app.use(multer({ storage: storage }).any());

app.use(cookieParser());
app.use(express.static(path.join(__dirname, '/../../public')));

// ユーザー認証
app.use((req, res, next) => {
    // リクエスト毎にユーザーインスタンスを再生成する
    User.deleteInstance();
    let user = User.getInstance();
    user.initialize(req.session, () => {
        next();
    });
});

// ルーティング
let router = Router.getInstance();
router.initialize(app);

export = app;
