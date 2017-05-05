/**
 * テンプレート変数をセットする
 *
 * @module middleware/setLocal
 */

import { CommonUtil } from '@motionpicture/chevre-domain';
import * as conf from 'config';
import { NextFunction, Request, Response } from 'express';
import * as moment from 'moment';
import * as numeral from 'numeral';

export default (req: Request, res: Response, next: NextFunction) => {
    res.locals.req = req;
    res.locals.moment = moment;
    res.locals.numeral = numeral;
    res.locals.conf = conf;
    res.locals.Util = CommonUtil;
    res.locals.validation = null;

    next();
};
