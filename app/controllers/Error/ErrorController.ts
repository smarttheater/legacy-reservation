import BaseController from '../BaseController';

export default class ErrorController extends BaseController {
    /**
     * Not Found
     */
    public notFound(): void {
        const status = 404;

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

        const status = 500;

        if (this.req.xhr) {
            this.res.status(status).json({
                success: false,
                message: err.message
            });
        } else {
            this.res.status(status);
            this.res.render('error/error', {
                message: err.message,
                error: err
            });
        }
    }
}
