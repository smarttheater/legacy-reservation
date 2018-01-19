/**
 * エラーハンドラーミドルウェア
 * 各アプリケーションコントローラーからnext(err)として遷移してくる
 */

import { NextFunction, Request, Response } from 'express';
import { BAD_REQUEST, INTERNAL_SERVER_ERROR } from 'http-status';

export default (err: any, __1: Request, res: Response, __2: NextFunction) => {
    if (res.statusCode >= INTERNAL_SERVER_ERROR) {
        // no op
        // 5xxのステータス指定済であればそのまま
    } else if (res.statusCode >= BAD_REQUEST) {
        // no op
        // 4xxのステータス指定済であればそのまま
    } else {
        // それ以外は500
        res.status(INTERNAL_SERVER_ERROR);
    }

    res.render('error/error', {
        message: err.message,
        error: err
    });
};
