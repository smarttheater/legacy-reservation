"use strict";
const log4js = require('log4js');
/**
 * ベースコントローラー
 */
class BaseController {
    constructor() {
        this.logger = log4js.getLogger('system');
    }
    shuffle(array) {
        let m = array.length, t, i;
        // While there remain elements to shuffle…
        while (m) {
            // Pick a remaining element…
            i = Math.floor(Math.random() * m--);
            // And swap it with the current element.
            t = array[m];
            array[m] = array[i];
            array[i] = t;
        }
        return array;
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = BaseController;
