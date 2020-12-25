"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * ルーティング
 */
const conf = require("config");
const express_1 = require("express");
const languageController = require("../controllers/language");
const api_1 = require("./api");
const customer_1 = require("./customer");
const entrance_1 = require("./entrance");
const inquiry_1 = require("./inquiry");
const reservations_1 = require("./reservations");
const NEW_ENDPOINT = process.env.NEW_ENDPOINT;
// 本体サイトのトップページの言語別URL
const topUrlByLocale = conf.get('official_url_top_by_locale');
// 本体サイトのFAQページの言語別URL
const faqUrlByLocale = conf.get('official_url_faq_by_locale');
// 本体サイトのチケット案内ページの言語別URL
const ticketInfoUrlByLocale = conf.get('official_url_ticketinfo_by_locale');
// 本体サイトの入場案内ページの言語別URL
const aboutEnteringUrlByLocale = conf.get('official_url_aboutentering_by_locale');
// 本体サイトの車椅子詳細案内ページの言語別URL
const wheelchairInfoUrlByLocale = conf.get('official_url_wheelchairinfo_by_locale');
// 本体サイトのプライバシーポリシーページの言語別URL
const privacyPolicyUrlByLocale = conf.get('official_url_privacypolicy_by_locale');
// 本体サイトのお問い合わせページの言語別URL
const contactUrlByLocale = conf.get('official_url_contact_by_locale');
// 言語ごとの対象ページリダイレクト用URLを得る (その言語のURLが無かった場合は英語版を返す)
const getRedirectOfficialUrl = (req, urlByLocale) => {
    const locale = (typeof req.getLocale() === 'string' && req.getLocale() !== '') ? req.getLocale() : 'en';
    return (urlByLocale[locale] !== undefined) ? urlByLocale[locale] : urlByLocale.en;
};
const router = express_1.Router();
router.use((req, res, next) => {
    if (typeof NEW_ENDPOINT === 'string' && NEW_ENDPOINT.length > 0) {
        res.redirect(`${NEW_ENDPOINT}${req.originalUrl}`);
        return;
    }
    next();
});
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
    res.locals.conf = conf;
    res.locals.validation = null;
    res.locals.title = 'Tokyo Tower';
    res.locals.description = 'TTTS Terms';
    res.locals.keywords = 'TTTS Terms';
    res.render('common/terms/');
});
// 特定商取引法に基づく表示ページ
router.get('/asct/', (req, res) => {
    res.locals.req = req;
    res.locals.conf = conf;
    res.locals.validation = null;
    res.locals.title = 'Tokyo Tower';
    res.locals.description = 'TTTS Act on Specified Commercial Transactions';
    res.locals.keywords = 'TTTS Act on Specified Commercial Transactions';
    res.render('common/asct/');
});
// 本体サイトのFAQページに転送
router.get('/faq', (req, res) => {
    res.redirect(getRedirectOfficialUrl(req, faqUrlByLocale));
});
// 本体サイトのチケット案内ページに転送
router.get('/ticketinfo', (req, res) => {
    res.redirect(getRedirectOfficialUrl(req, ticketInfoUrlByLocale));
});
// 本体サイトの入場案内ページの対応言語版に転送
router.get('/aboutenter', (req, res) => {
    res.redirect(getRedirectOfficialUrl(req, aboutEnteringUrlByLocale));
});
// 本体サイトの車椅子詳細案内ページの対応言語版に転送
router.get('/wheelchairinfo', (req, res) => {
    res.redirect(getRedirectOfficialUrl(req, wheelchairInfoUrlByLocale));
});
// 本体サイトのプライバシーポリシーページの対応言語版に転送
router.get('/privacypolicy', (req, res) => {
    res.redirect(getRedirectOfficialUrl(req, privacyPolicyUrlByLocale));
});
// 本体サイトのお問い合わせページの対応言語版に転送
router.get('/contact', (req, res) => {
    res.redirect(getRedirectOfficialUrl(req, contactUrlByLocale));
});
// 本体サイトトップページの対応言語版に転送
router.get('/returntop', (req, res) => {
    res.redirect(getRedirectOfficialUrl(req, topUrlByLocale));
});
exports.default = router;
