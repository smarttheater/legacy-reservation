"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * ルーティング
 */
const express_1 = require("express");
const languageController = require("../controllers/language");
const api_1 = require("./api");
const customer_1 = require("./customer");
const entrance_1 = require("./entrance");
const externalLinks_1 = require("./externalLinks");
const health_1 = require("./health");
const inquiry_1 = require("./inquiry");
const reservations_1 = require("./reservations");
const NEW_ENDPOINT = process.env.NEW_ENDPOINT;
const router = express_1.Router();
router.use((req, res, next) => {
    if (typeof NEW_ENDPOINT === 'string' && NEW_ENDPOINT.length > 0) {
        res.redirect(`${NEW_ENDPOINT}${req.originalUrl}`);
        return;
    }
    next();
});
router.use('/health', health_1.default);
// 言語
router.get('/language/update/:locale', languageController.update);
// ルーティング登録の順序に注意！
router.use('/api', api_1.default);
router.use('/customer', customer_1.default);
router.use('/entrance', entrance_1.default);
// チケット照会
router.use('/inquiry', inquiry_1.default);
// 印刷
router.use('/reservations', reservations_1.default);
// 利用規約ページ
router.get('/terms/', (req, res) => {
    res.locals.req = req;
    // tslint:disable-next-line:no-null-keyword
    res.locals.validation = null;
    res.locals.title = 'Tokyo Tower';
    res.locals.description = 'Terms';
    res.locals.keywords = 'Terms';
    res.render('common/terms/');
});
// 特定商取引法に基づく表示ページ
router.get('/asct/', (req, res) => {
    res.locals.req = req;
    // tslint:disable-next-line:no-null-keyword
    res.locals.validation = null;
    res.locals.title = 'Tokyo Tower';
    res.locals.description = 'Act on Specified Commercial Transactions';
    res.locals.keywords = 'Act on Specified Commercial Transactions';
    res.render('common/asct/');
});
router.use(externalLinks_1.default);
exports.default = router;
