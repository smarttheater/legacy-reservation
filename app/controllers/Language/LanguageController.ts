import BaseController from '../BaseController';

/**
 * 言語コントローラー
 *
 * @export
 * @class LanguageController
 * @extends {BaseController}
 */
export default class LanguageController extends BaseController {
    /**
     * 言語切り替え
     */
    public update(): void {
        const locale = this.req.params.locale;
        (<any>this.req.session).locale = locale;

        const cb = (this.req.query.cb !== undefined && this.req.query.cb !== '') ? this.req.query.cb : '/';
        this.res.redirect(cb);
    }
}
