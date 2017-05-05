"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * ベースコントローラー
 *
 * @class BaseController
 */
class BaseController {
    constructor(req, res, next) {
        this.req = req;
        this.res = res;
        this.next = next;
    }
}
exports.default = BaseController;
