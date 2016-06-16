import BaseController from '../BaseController';

export default class IndexController extends BaseController {
    public index(): void {
        this.res.render('index/index', {
        });
    }
}
