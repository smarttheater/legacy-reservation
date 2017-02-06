"use strict";
const express = require("express");
// import cookieParser = require('cookie-parser');
const bodyParser = require("body-parser");
// import multer = require('multer');
const logger_1 = require("./middlewares/logger");
const benchmarks_1 = require("./middlewares/benchmarks");
const router_1 = require("./routes/router");
const conf = require("config");
const mongoose = require("mongoose");
const i18n = require("i18n");
const passport = require("passport");
const passportHttpBearer = require("passport-http-bearer");
let BearerStrategy = passportHttpBearer.Strategy;
const ttts_domain_1 = require("@motionpicture/ttts-domain");
passport.use(new BearerStrategy((token, cb) => {
    ttts_domain_1.Models.Authentication.findOne({
        token: token
    }, (err, authentication) => {
        if (err)
            return cb(err);
        if (!authentication)
            return cb(null, false);
        cb(null, authentication);
    });
}));
let app = express();
if (process.env.NODE_ENV === 'dev') {
    app.use(logger_1.default); // ロガー
}
if (process.env.NODE_ENV !== 'prod') {
    // サーバーエラーテスト
    app.get('/api/500', (req, res) => {
        req.on('data', (chunk) => {
        });
        req.on('end', () => {
            throw new Error('500 manually.');
        });
    });
    app.get('/api/disconnect', (req, res) => {
        mongoose.disconnect((err) => {
            res.send('disconnected.');
        });
    });
    app.get('/api/connect', (req, res) => {
        mongoose.connect(MONGOLAB_URI, (err) => {
            res.send('connected.');
        });
    });
}
app.use(benchmarks_1.default); // ベンチマーク的な
// view engine setup
app.set('views', `${__dirname}/views`);
app.set('view engine', 'ejs');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
// for parsing multipart/form-data
// let storage = multer.memoryStorage()
// app.use(multer({ storage: storage }).any());
// app.use(cookieParser());
// i18n を利用する設定
i18n.configure({
    locales: ['en', 'ja'],
    defaultLocale: 'en',
    directory: __dirname + '/../../locales',
    objectNotation: true,
    updateFiles: false // ページのビューで自動的に言語ファイルを更新しない
});
// i18n の設定を有効化
app.use(i18n.init);
// ルーティング
router_1.default(app);
let MONGOLAB_URI = conf.get('mongolab_uri');
// Use native promises
mongoose.Promise = global.Promise;
mongoose.connect(MONGOLAB_URI, {});
if (process.env.NODE_ENV !== 'prod') {
    let db = mongoose.connection;
    db.on('connecting', function () {
        console.log('connecting');
    });
    db.on('error', function (error) {
        console.error('Error in MongoDb connection: ', error);
    });
    db.on('connected', function () {
        console.log('connected.');
    });
    db.once('open', function () {
        console.log('connection open.');
    });
    db.on('reconnected', function () {
        console.log('reconnected.');
    });
    db.on('disconnected', function () {
        console.log('disconnected.');
    });
}
module.exports = app;
