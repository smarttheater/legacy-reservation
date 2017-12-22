/**
 * エラーハンドラーミドルウェア
 */

import { NextFunction, Request, Response } from 'express';
import { INTERNAL_SERVER_ERROR } from 'http-status';

export default (err: any, __1: Request, res: Response, __2: NextFunction) => {
    res.status(INTERNAL_SERVER_ERROR);
    res.render('error/error', {
        message: err.message,
        error: err
    });
};
