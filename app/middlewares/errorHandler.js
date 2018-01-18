"use strict";
/**
 * エラーハンドラーミドルウェア
 * 各アプリケーションコントローラーからnext(err)として遷移してくる
 */
Object.defineProperty(exports, "__esModule", { value: true });
const http_status_1 = require("http-status");
exports.default = (err, __1, res, __2) => {
    if (res.statusCode >= http_status_1.INTERNAL_SERVER_ERROR) {
        // no op
        // 5xxのステータス指定済であればそのまま
    }
    else if (res.statusCode >= http_status_1.BAD_REQUEST) {
        // no op
        // 4xxのステータス指定済であればそのまま
    }
    else {
        // それ以外は500
        res.status(http_status_1.INTERNAL_SERVER_ERROR);
    }
    res.render('error/error', {
        message: err.message,
        error: err
    });
};
