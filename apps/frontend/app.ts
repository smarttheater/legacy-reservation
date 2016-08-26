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
import conf = require('config');
import mongoose = require('mongoose');
import i18n = require('i18n');
import log4js = require('log4js');

let app = express();

app.use(partials()); // レイアウト&パーシャルサポート
app.use(useragent.express()); // ユーザーエージェント
app.use(logger); // ロガー
app.use(benchmarks); // ベンチマーク的な
app.use(session); // セッション





// ルーティング
import NamedRoutes = require('named-routes');
import payDesign from './routes/payDesign';
import memberRouter from './routes/member';
import sponsorRouter from './routes/sponsor';
import staffRouter from './routes/staff';
import telRouter from './routes/tel';
import windowRouter from './routes/window';
import router from './routes/router';

let namedRoutes = new NamedRoutes();
namedRoutes.extendExpress(app);
namedRoutes.registerAppHelpers(app);



// ペイデザイン連携のため
payDesign(app);





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






// ルーティング登録の順序に注意！
memberRouter(app);
sponsorRouter(app);
staffRouter(app);
telRouter(app);
windowRouter(app);
router(app);



let MONGOLAB_URI = conf.get<string>('mongolab_uri');

mongoose.connect(MONGOLAB_URI, {});

export = app;
