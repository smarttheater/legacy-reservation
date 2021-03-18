"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * 外部サイトルーティング
 */
const express_1 = require("express");
const MOVIE_THEATER_WEBSITE_ENDPOINT = process.env.MOVIE_THEATER_WEBSITE_ENDPOINT;
const EVENT_WEBSITE_ENDPOINT = process.env.EVENT_WEBSITE_ENDPOINT;
// 本体サイトのトップページの言語別URL
const topUrlByLocale = {
    ja: `${MOVIE_THEATER_WEBSITE_ENDPOINT}/`,
    en: `${MOVIE_THEATER_WEBSITE_ENDPOINT}/en.html`,
    'zh-hans': `${MOVIE_THEATER_WEBSITE_ENDPOINT}/cn.html`,
    'zh-hant': `${MOVIE_THEATER_WEBSITE_ENDPOINT}/zh.html`,
    ko: `${MOVIE_THEATER_WEBSITE_ENDPOINT}/kr.html`,
    th: `${MOVIE_THEATER_WEBSITE_ENDPOINT}/en.html`,
    id: `${MOVIE_THEATER_WEBSITE_ENDPOINT}/en.html`,
    vi: `${MOVIE_THEATER_WEBSITE_ENDPOINT}/en.html`,
    fr: `${MOVIE_THEATER_WEBSITE_ENDPOINT}/en.html`,
    de: `${MOVIE_THEATER_WEBSITE_ENDPOINT}/en.html`,
    it: `${MOVIE_THEATER_WEBSITE_ENDPOINT}/en.html`,
    es: `${MOVIE_THEATER_WEBSITE_ENDPOINT}/en.html`,
    ru: `${MOVIE_THEATER_WEBSITE_ENDPOINT}/en.html`
};
// 本体サイトのFAQページの言語別URL
const faqUrlByLocale = {
    ja: `${EVENT_WEBSITE_ENDPOINT}/#faq`,
    en: `${EVENT_WEBSITE_ENDPOINT}/en/#faq`,
    'zh-hans': `${EVENT_WEBSITE_ENDPOINT}/cn/#faq`,
    'zh-hant': `${EVENT_WEBSITE_ENDPOINT}/zh/#faq`,
    ko: `${EVENT_WEBSITE_ENDPOINT}/ko/#faq`,
    th: `${EVENT_WEBSITE_ENDPOINT}/th/#faq`,
    id: `${EVENT_WEBSITE_ENDPOINT}/in/#faq`,
    vi: `${EVENT_WEBSITE_ENDPOINT}/vi/#faq`,
    fr: `${EVENT_WEBSITE_ENDPOINT}/fr/#faq`,
    de: `${EVENT_WEBSITE_ENDPOINT}/de/#faq`,
    it: `${EVENT_WEBSITE_ENDPOINT}/it/#faq`,
    es: `${EVENT_WEBSITE_ENDPOINT}/es/#faq`,
    ru: `${EVENT_WEBSITE_ENDPOINT}/ru/#faq`
};
// 本体サイトのチケット案内ページの言語別URL
const ticketInfoUrlByLocale = {
    ja: `${EVENT_WEBSITE_ENDPOINT}/#price`,
    en: `${EVENT_WEBSITE_ENDPOINT}/en/#price`,
    'zh-hans': `${EVENT_WEBSITE_ENDPOINT}/cn/#price`,
    'zh-hant': `${EVENT_WEBSITE_ENDPOINT}/zh/#price`,
    ko: `${EVENT_WEBSITE_ENDPOINT}/ko/#price`,
    th: `${EVENT_WEBSITE_ENDPOINT}/th/#price`,
    id: `${EVENT_WEBSITE_ENDPOINT}/in/#price`,
    vi: `${EVENT_WEBSITE_ENDPOINT}/vi/#price`,
    fr: `${EVENT_WEBSITE_ENDPOINT}/fr/#price`,
    de: `${EVENT_WEBSITE_ENDPOINT}/de/#price`,
    it: `${EVENT_WEBSITE_ENDPOINT}/it/#price`,
    es: `${EVENT_WEBSITE_ENDPOINT}/es/#price`,
    ru: `${EVENT_WEBSITE_ENDPOINT}/ru/#price`
};
// 本体サイトの入場案内ページの言語別URL
const aboutEnteringUrlByLocale = {
    ja: `${EVENT_WEBSITE_ENDPOINT}/#set`,
    en: `${EVENT_WEBSITE_ENDPOINT}/en/#set`,
    'zh-hans': `${EVENT_WEBSITE_ENDPOINT}/cn/#set`,
    'zh-hant': `${EVENT_WEBSITE_ENDPOINT}/zh/#set`,
    ko: `${EVENT_WEBSITE_ENDPOINT}/ko/#set`,
    th: `${EVENT_WEBSITE_ENDPOINT}/th/#set`,
    id: `${EVENT_WEBSITE_ENDPOINT}/in/#set`,
    vi: `${EVENT_WEBSITE_ENDPOINT}/vi/#set`,
    fr: `${EVENT_WEBSITE_ENDPOINT}/fr/#set`,
    de: `${EVENT_WEBSITE_ENDPOINT}/de/#set`,
    it: `${EVENT_WEBSITE_ENDPOINT}/it/#set`,
    es: `${EVENT_WEBSITE_ENDPOINT}/es/#set`,
    ru: `${EVENT_WEBSITE_ENDPOINT}/ru/#set`
};
// 本体サイトの車椅子詳細案内ページの言語別URL
const wheelchairInfoUrlByLocale = {
    ja: `${EVENT_WEBSITE_ENDPOINT}/#chair`,
    en: `${EVENT_WEBSITE_ENDPOINT}/en/#chair`,
    'zh-hans': `${EVENT_WEBSITE_ENDPOINT}/cn/#chair`,
    'zh-hant': `${EVENT_WEBSITE_ENDPOINT}/zh/#chair`,
    ko: `${EVENT_WEBSITE_ENDPOINT}/ko/#chair`,
    th: `${EVENT_WEBSITE_ENDPOINT}/th/#chair`,
    id: `${EVENT_WEBSITE_ENDPOINT}/in/#chair`,
    vi: `${EVENT_WEBSITE_ENDPOINT}/vi/#chair`,
    fr: `${EVENT_WEBSITE_ENDPOINT}/fr/#chair`,
    de: `${EVENT_WEBSITE_ENDPOINT}/de/#chair`,
    it: `${EVENT_WEBSITE_ENDPOINT}/it/#chair`,
    es: `${EVENT_WEBSITE_ENDPOINT}/es/#chair`,
    ru: `${EVENT_WEBSITE_ENDPOINT}/ru/#chair`
};
// 本体サイトのプライバシーポリシーページの言語別URL
const privacyPolicyUrlByLocale = {
    ja: `${MOVIE_THEATER_WEBSITE_ENDPOINT}/privacypolicy/index.html`,
    en: `${MOVIE_THEATER_WEBSITE_ENDPOINT}/privacypolicy/en.html`,
    'zh-hans': `${MOVIE_THEATER_WEBSITE_ENDPOINT}/privacypolicy/cn.html`,
    'zh-hant': `${MOVIE_THEATER_WEBSITE_ENDPOINT}/privacypolicy/zh.html`,
    ko: `${MOVIE_THEATER_WEBSITE_ENDPOINT}/privacypolicy/kr.html`,
    th: `${MOVIE_THEATER_WEBSITE_ENDPOINT}/privacypolicy/en.html`,
    id: `${MOVIE_THEATER_WEBSITE_ENDPOINT}/privacypolicy/en.html`,
    vi: `${MOVIE_THEATER_WEBSITE_ENDPOINT}/privacypolicy/en.html`,
    fr: `${MOVIE_THEATER_WEBSITE_ENDPOINT}/privacypolicy/en.html`,
    de: `${MOVIE_THEATER_WEBSITE_ENDPOINT}/privacypolicy/en.html`,
    it: `${MOVIE_THEATER_WEBSITE_ENDPOINT}/privacypolicy/en.html`,
    es: `${MOVIE_THEATER_WEBSITE_ENDPOINT}/privacypolicy/en.html`,
    ru: `${MOVIE_THEATER_WEBSITE_ENDPOINT}/privacypolicy/en.html`
};
// 本体サイトのお問い合わせページの言語別URL
const contactUrlByLocale = {
    ja: `${MOVIE_THEATER_WEBSITE_ENDPOINT}/contact/index.html`,
    en: `${MOVIE_THEATER_WEBSITE_ENDPOINT}/contact/en.html`,
    'zh-hant': `${MOVIE_THEATER_WEBSITE_ENDPOINT}`,
    'zh-hans': `${MOVIE_THEATER_WEBSITE_ENDPOINT}`,
    ko: `${MOVIE_THEATER_WEBSITE_ENDPOINT}`,
    th: `${MOVIE_THEATER_WEBSITE_ENDPOINT}`,
    id: `${MOVIE_THEATER_WEBSITE_ENDPOINT}`,
    vi: `${MOVIE_THEATER_WEBSITE_ENDPOINT}`,
    fr: `${MOVIE_THEATER_WEBSITE_ENDPOINT}`,
    de: `${MOVIE_THEATER_WEBSITE_ENDPOINT}`,
    it: `${MOVIE_THEATER_WEBSITE_ENDPOINT}`,
    es: `${MOVIE_THEATER_WEBSITE_ENDPOINT}`,
    ru: `${MOVIE_THEATER_WEBSITE_ENDPOINT}`
};
// 言語ごとの対象ページリダイレクト用URLを得る (その言語のURLが無かった場合は英語版を返す)
const getRedirectOfficialUrl = (req, urlByLocale) => {
    const localeByRequest = req.getLocale();
    const locale = (typeof localeByRequest === `string` && localeByRequest.length > 0) ? localeByRequest : `en`;
    return (urlByLocale[locale] !== undefined) ? urlByLocale[locale] : urlByLocale.en;
};
const externalLinksRouter = express_1.Router();
// 本体サイトのFAQページに転送
externalLinksRouter.get('/faq', (req, res) => {
    res.redirect(getRedirectOfficialUrl(req, faqUrlByLocale));
});
// 本体サイトのチケット案内ページに転送
externalLinksRouter.get('/ticketinfo', (req, res) => {
    res.redirect(getRedirectOfficialUrl(req, ticketInfoUrlByLocale));
});
// 本体サイトの入場案内ページの対応言語版に転送
externalLinksRouter.get('/aboutenter', (req, res) => {
    res.redirect(getRedirectOfficialUrl(req, aboutEnteringUrlByLocale));
});
// 本体サイトの車椅子詳細案内ページの対応言語版に転送
externalLinksRouter.get('/wheelchairinfo', (req, res) => {
    res.redirect(getRedirectOfficialUrl(req, wheelchairInfoUrlByLocale));
});
// 本体サイトのプライバシーポリシーページの対応言語版に転送
externalLinksRouter.get('/privacypolicy', (req, res) => {
    res.redirect(getRedirectOfficialUrl(req, privacyPolicyUrlByLocale));
});
// 本体サイトのお問い合わせページの対応言語版に転送
externalLinksRouter.get('/contact', (req, res) => {
    res.redirect(getRedirectOfficialUrl(req, contactUrlByLocale));
});
// 本体サイトトップページの対応言語版に転送
externalLinksRouter.get('/returntop', (req, res) => {
    res.redirect(getRedirectOfficialUrl(req, topUrlByLocale));
});
exports.default = externalLinksRouter;
