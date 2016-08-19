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
import router from './routes/router';
import conf = require('config');
import mongoose = require('mongoose');
import i18n = require('i18n');
import passport = require('passport');
import passportHttpBearer = require('passport-http-bearer');
let BearerStrategy = passportHttpBearer.Strategy;
import Models from '../common/models/Models';

passport.use(new BearerStrategy(
    (token, cb) => {

        Models.Authentication.findOne(
            {
                token: token
            },
            (err, authentication) => {
                if (err) {
                    return cb(err);
                }

                if (!authentication) {
                    return cb(null, false);
                }

                return cb(null, authentication);
            }
        );
    }
));

let app = express();

app.use(partials()); // レイアウト&パーシャルサポート
app.use(useragent.express()); // ユーザーエージェント
app.use(logger); // ロガー
app.use(benchmarks); // ベンチマーク的な

// view engine setup
app.set('views', `${__dirname}/views`);
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// for parsing multipart/form-data
let storage = multer.memoryStorage()
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
router(app);


let MONGOLAB_URI = conf.get<string>('mongolab_uri');

mongoose.connect(MONGOLAB_URI, {});

export = app;
