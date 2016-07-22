"use strict";
var express = require('express');
var partials = require('express-partials');
var useragent = require('express-useragent');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var multer = require('multer');
var logger_1 = require('./middlewares/logger');
var benchmarks_1 = require('./middlewares/benchmarks');
var router_1 = require('./routes/router');
var conf = require('config');
var mongoose = require('mongoose');
var i18n = require('i18n');
var app = express();
app.use(partials()); // レイアウト&パーシャルサポート
app.use(useragent.express()); // ユーザーエージェント
app.use(logger_1.default); // ロガー
app.use(benchmarks_1.default); // ベンチマーク的な
// view engine setup
app.set('views', __dirname + "/views");
app.set('view engine', 'ejs');
// uncomment after placing your favicon in /public
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
// for parsing multipart/form-data
var storage = multer.memoryStorage();
app.use(multer({ storage: storage }).any());
app.use(cookieParser());
// i18n を利用する設定
i18n.configure({
    locales: ['en', 'ja'],
    defaultLocale: 'en',
    directory: __dirname + '/../../locales',
    objectNotation: true
});
// i18n の設定を有効化
app.use(i18n.init);
// ルーティング
router_1.default(app);
var MONGOLAB_URI = conf.get('mongolab_uri');
mongoose.connect(MONGOLAB_URI, {});
module.exports = app;
