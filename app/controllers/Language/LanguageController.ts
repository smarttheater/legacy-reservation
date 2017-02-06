import BaseController from '../BaseController';

export default class LanguageController extends BaseController {
    /**
     * 言語切り替え
     */
    public update(): void {
        let locale = this.req.params.locale;
        this.req.session['locale'] = locale;

        let cb = (this.req.query.cb) ? this.req.query.cb : '/';
        this.res.redirect(cb);
    }
}
