import BaseController from '../BaseController';

export default class LanguageController extends BaseController {
    /**
     * 言語切り替え
     */
    public update(): void {
        const locale = this.req.params.locale;
        this.req.session['locale'] = locale;

        const cb = (this.req.query.cb) ? this.req.query.cb : '/';
        this.res.redirect(cb);
    }
}
