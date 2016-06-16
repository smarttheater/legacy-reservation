import BaseController from '../BaseController';

export default class ErrorController extends BaseController {
    /**
     * Not Found
     */
    public notFound(): void {
        let status = 404;

        if (this.req.xhr) {
            this.res.status(status).send({ error: 'Not Found.' });
        } else {
            this.res.status(status);
            this.res.render('error/notFound', {
            });
        }
    }

    /**
     * エラーページ
     */
    public index(err: Error): void {
        this.logger.error(err.stack);

        let status = 500;

        if (this.req.xhr) {
            this.res.status(status).send({ error: 'Something failed.' });
        } else {
            this.res.status(status);
            this.res.render('error/error', {
                message: err.message,
                error: err
            });
        }
    }
}
