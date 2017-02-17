"use strict";
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
        const status = 404;
        if (this.req.xhr) {
            this.res.status(status).send({ error: 'Not Found.' });
        }
        else {
            this.res.status(status);
            this.res.render('error/notFound', {});
        }
    }
    /**
     * エラーページ
     */
    index(err) {
        this.logger.error(err.message, err.stack);
        const status = 500;
        if (this.req.xhr) {
            this.res.status(status).json({
                success: false,
                message: err.message
            });
        }
        else {
            this.res.status(status);
            this.res.render('error/error', {
                message: err.message,
                error: err
            });
        }
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ErrorController;
