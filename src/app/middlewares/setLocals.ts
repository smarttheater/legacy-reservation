/**
 * テンプレート変数をセットする
 */
import { NextFunction, Request, Response } from 'express';
import * as moment from 'moment-timezone';
import * as numeral from 'numeral';

import { locales } from '../factory/locales';

export default (req: Request, res: Response, next: NextFunction) => {
    let momentLocale = (typeof req.getLocale() === 'string') ? req.getLocale() : '';
    if (momentLocale === 'zh-hans') {
        momentLocale = 'zh-cn';
    } else if (momentLocale === 'zh-hant') {
        momentLocale = 'zh-tw';
    }
    if (momentLocale !== '') {
        moment.locale(momentLocale);
    }

    res.locals.req = req;
    res.locals.moment = moment;
    res.locals.numeral = numeral;
    // tslint:disable-next-line:no-null-keyword
    res.locals.validation = null;
    res.locals.officialWebsiteUrl = '';
    res.locals.title = 'Order Details';
    res.locals.pageId = '';
    res.locals.pageClassName = '';
    res.locals.locales = locales;

    next();
};
