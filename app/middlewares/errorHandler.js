"use strict";
/**
 * エラーハンドラーミドルウェア
 */
Object.defineProperty(exports, "__esModule", { value: true });
const http_status_1 = require("http-status");
exports.default = (err, __1, res, __2) => {
    res.status(http_status_1.INTERNAL_SERVER_ERROR);
    res.render('error/error', {
        message: err.message,
        error: err
    });
};
