/**
 * expressアプリケーション
 *
 * @module app
 * @global
 */
import * as bodyParser from 'body-parser';
import * as cookieParser from 'cookie-parser';
import * as express from 'express';
// tslint:disable-next-line:no-require-imports
import partials = require('express-partials');
import * as i18n from 'i18n';
import * as mongoose from 'mongoose';
import * as multer from 'multer';
import * as favicon from 'serve-favicon';
import basicAuth from './middlewares/basicAuth';
import benchmarks from './middlewares/benchmarks';
import logger from './middlewares/logger';
import session from './middlewares/session';

const app = express();

app.use(partials()); // レイアウト&パーシャルサポート

if (process.env.NODE_ENV === 'development') {
    app.use(logger); // ロガー
}

app.use(benchmarks); // ベンチマーク的な
app.use(session); // セッション
app.use(basicAuth); // ベーシック認証

// ルーティング
import * as NamedRoutes from 'named-routes';
import customerSupport from './routes/customerSupport';
import memberRouter from './routes/member';
import payDesign from './routes/payDesign';
import preRouter from './routes/pre';
import router from './routes/router';
import sendGridRouter from './routes/sendGrid';
import sponsorRouter from './routes/sponsor';
import staffRouter from './routes/staff';
import telRouter from './routes/tel';
import windowRouter from './routes/window';

const namedRoutes = new NamedRoutes();
namedRoutes.extendExpress(app);
namedRoutes.registerAppHelpers(app);

if (process.env.NODE_ENV !== 'production') {
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
payDesign(app);

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
    if ((<any>req.session).locale) {
        req.setLocale((<any>req.session).locale);
    }

    if (req.query.locale) {
        req.setLocale(req.query.locale);
        (<any>req.session).locale = req.query.locale;
    }

    next();
});

// ルーティング登録の順序に注意！
memberRouter(app);
sponsorRouter(app);
staffRouter(app);
telRouter(app);
windowRouter(app);
customerSupport(app);
preRouter(app);
sendGridRouter(app);
router(app);

/*
 * Mongoose by default sets the auto_reconnect option to true.
 * We recommend setting socket options at both the server and replica set level.
 * We recommend a 30 second connection timeout because it allows for
 * plenty of time in most operating environments.
 */
const MONGOLAB_URI = process.env.MONGOLAB_URI;
// Use native promises
(<any>mongoose).Promise = global.Promise;
mongoose.connect(
    MONGOLAB_URI,
    {
        server: { socketOptions: { keepAlive: 300000, connectTimeoutMS: 30000 } },
        replset: { socketOptions: { keepAlive: 300000, connectTimeoutMS: 30000 } }
    }
);

export = app;
