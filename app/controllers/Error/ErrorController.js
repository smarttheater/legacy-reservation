"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const http_status_1 = require("http-status");
const BaseController_1 = require("../BaseController");
/**
 * エラーページコントローラー
 *
 * @export
 * @class ErrorController
 * @extends {BaseController}
 */
class ErrorController extends BaseController_1.default {
    /**
     * Not Found
     */
    notFound() {
        if (this.req.xhr) {
            this.res.status(http_status_1.NOT_FOUND).send({ error: 'Not Found.' });
        }
        else {
            this.res.status(http_status_1.NOT_FOUND);
            this.res.render('error/notFound', {});
        }
    }
    /**
     * エラーページ
     */
    index(err) {
        console.error(err.message, err.stack);
        if (this.req.xhr) {
            this.res.status(http_status_1.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: err.message
            });
        }
        else {
            this.res.status(http_status_1.INTERNAL_SERVER_ERROR);
            this.res.render('error/error', {
                message: err.message,
                error: err
            });
        }
    }
}
exports.default = ErrorController;
