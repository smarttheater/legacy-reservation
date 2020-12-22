"use strict";
/**
 * テンプレート変数をセットする
 *
 * @module middleware/setLocal
 */
Object.defineProperty(exports, "__esModule", { value: true });
const conf = require("config");
const moment = require("moment-timezone");
const numeral = require("numeral");
exports.default = (req, res, next) => {
    let momentLocale = (typeof req.getLocale() === 'string') ? req.getLocale() : '';
    if (momentLocale === 'zh-hans') {
        momentLocale = 'zh-cn';
    }
    else if (momentLocale === 'zh-hant') {
        momentLocale = 'zh-tw';
    }
    if (momentLocale !== '') {
        moment.locale(momentLocale);
    }
    res.locals.req = req;
    res.locals.moment = moment;
    res.locals.numeral = numeral;
    res.locals.conf = conf;
    res.locals.validation = null;
    res.locals.officialWebsiteUrl = '';
    res.locals.title = 'Order Details';
    res.locals.pageId = '';
    res.locals.pageClassName = '';
    next();
};
