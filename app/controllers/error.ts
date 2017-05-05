/**
 * エラーページコントローラー
 *
 * @namespace controller/error
 */

import { NextFunction, Request, Response } from 'express';
import { INTERNAL_SERVER_ERROR, NOT_FOUND } from 'http-status';

/**
 * Not Found
 */
export function notFound(req: Request, res: Response, __: NextFunction): void {
    if (req.xhr) {
        res.status(NOT_FOUND).send({ error: 'Not Found.' });
    } else {
        res.status(NOT_FOUND);
        res.render('error/notFound', {
        });
    }
}

/**
 * エラーページ
 */
export function index(err: Error, req: Request, res: Response, __: NextFunction): void {
    console.error(err.message, err.stack);

    if (req.xhr) {
        res.status(INTERNAL_SERVER_ERROR).json({
            success: false,
            message: err.message
        });
    } else {
        res.status(INTERNAL_SERVER_ERROR);
        res.render('error/error', {
            message: err.message,
            error: err
        });
    }
}
