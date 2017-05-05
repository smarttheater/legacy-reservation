"use strict";
/**
 * エラーページコントローラー
 *
 * @namespace controller/error
 */
Object.defineProperty(exports, "__esModule", { value: true });
const http_status_1 = require("http-status");
/**
 * Not Found
 */
function notFound(req, res, __) {
    if (req.xhr) {
        res.status(http_status_1.NOT_FOUND).send({ error: 'Not Found.' });
    }
    else {
        res.status(http_status_1.NOT_FOUND);
        res.render('error/notFound', {});
    }
}
exports.notFound = notFound;
/**
 * エラーページ
 */
function index(err, req, res, __) {
    console.error(err.message, err.stack);
    if (req.xhr) {
        res.status(http_status_1.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: err.message
        });
    }
    else {
        res.status(http_status_1.INTERNAL_SERVER_ERROR);
        res.render('error/error', {
            message: err.message,
            error: err
        });
    }
}
exports.index = index;
