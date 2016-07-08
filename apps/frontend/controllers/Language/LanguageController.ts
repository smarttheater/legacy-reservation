import BaseController from '../BaseController';

export default class LanguageController extends BaseController {
    /**
     * 言語切り替え
     */
    public update(): void {
        let locale = this.req.params.locale;
        this.req.session['locale'] = locale;
        this.res.redirect(this.router.build('Home'));
    }
}
