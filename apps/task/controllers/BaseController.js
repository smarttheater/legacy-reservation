"use strict";
const fs = require("fs-extra");
const log4js = require("log4js");
/**
 * ベースコントローラー
 */
class BaseController {
    /**
     * constructor
     *
     * @param {string} ログディレクトリ
     */
    constructor(logDir) {
        fs.mkdirsSync(logDir);
        log4js.configure({
            appenders: [
                {
                    category: 'system',
                    type: 'dateFile',
                    filename: `${logDir}/system.log`,
                    pattern: '-yyyy-MM-dd',
                    backups: 3
                },
                {
                    type: 'console'
                }
            ],
            levels: {
                system: 'ALL'
            },
            replaceConsole: true
        });
        this.logger = log4js.getLogger('system');
    }
    shuffle(array) {
        let m = array.length, t, i;
        while (m) {
            m--;
            i = Math.floor(Math.random() * m);
            t = array[m];
            array[m] = array[i];
            array[i] = t;
        }
        return array;
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * ベースコントローラー
 */
exports.default = BaseController;
