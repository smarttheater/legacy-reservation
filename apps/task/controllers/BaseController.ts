import log4js = require('log4js');
import moment = require('moment');
import util = require('util');

/**
 * ベースコントローラー
 */
export default class BaseController
{
    /**
     * ロガー
     */
    public logger: log4js.Logger;


    constructor() {
        this.logger = log4js.getLogger('system');
    }
}
