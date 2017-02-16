import SendGridController from '../controllers/SendGrid/SendGridController';

export default (app: any) => {
    // イベントフック
    app.all('/sendGrid/event/notify', 'sendGrid.event.notify', (req, res, next) => {(new SendGridController(req, res, next)).notifyEvent(); });
};
