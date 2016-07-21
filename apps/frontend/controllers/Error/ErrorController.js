"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var BaseController_1 = require('../BaseController');
var ErrorController = (function (_super) {
    __extends(ErrorController, _super);
    function ErrorController() {
        _super.apply(this, arguments);
    }
    /**
     * Not Found
     */
    ErrorController.prototype.notFound = function () {
        var status = 404;
        if (this.req.xhr) {
            this.res.status(status).send({ error: 'Not Found.' });
        }
        else {
            this.res.status(status);
            this.res.render('error/notFound', {});
        }
    };
    /**
     * エラーページ
     */
    ErrorController.prototype.index = function (err) {
        this.logger.error(err.stack);
        var status = 500;
        if (this.req.xhr) {
            this.res.status(status).send({ error: 'Something failed.' });
        }
        else {
            this.res.status(status);
            this.res.render('error/error', {
                message: err.message,
                error: err
            });
        }
    };
    return ErrorController;
}(BaseController_1.default));
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ErrorController;
