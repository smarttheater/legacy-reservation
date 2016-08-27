import BaseController from '../BaseController';

export default class OtherController extends BaseController {
    public policy(): void {
        this.res.render('other/policy');
    }

    public privacy(): void {
        this.res.render('other/privacy');
    }

    public commercialTransactions(): void {
        this.res.render('other/commercialTransactions');
    }
}
