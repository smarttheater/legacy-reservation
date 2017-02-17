import BaseController from '../BaseController';

/**
 * 静的ページコントローラー
 *
 * @export
 * @class OtherController
 * @extends {BaseController}
 */
export default class OtherController extends BaseController {
    public policy(): void {
        this.res.render(`other/policy_${this.req.getLocale()}`);
    }

    public privacy(): void {
        this.res.render(`other/privacy_${this.req.getLocale()}`);
    }

    public commercialTransactions(): void {
        this.res.render(`other/commercialTransactions_${this.req.getLocale()}`);
    }
}
