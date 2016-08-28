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
