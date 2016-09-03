import log4js = require('log4js');

/**
 * ベースコントローラー
 */
export default class BaseController
{
    /** ロガー */
    public logger: log4js.Logger;

    constructor() {
        this.logger = log4js.getLogger('system');
    }

    protected shuffle(array: Array<any>) {
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
