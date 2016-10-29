import BaseController from '../BaseController';
import Models from '../../../common/models/Models';

export default class SendGridController extends BaseController {
    /**
     * SendGridイベントフック
     */
    public notifyEvent(): void {
        this.logger.info('SendGrid event notification is', this.req.body);
        this.res.json({
            success: true,
            message: 'success'
        });
    }
}
