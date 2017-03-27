import { INTERNAL_SERVER_ERROR, NOT_FOUND } from 'http-status';
import BaseController from '../BaseController';

/**
 * エラーページコントローラー
 *
 * @export
 * @class ErrorController
 * @extends {BaseController}
 */
export default class ErrorController extends BaseController {
    /**
     * Not Found
     */
    public notFound(): void {
        if (this.req.xhr) {
            this.res.status(NOT_FOUND).send({ error: 'Not Found.' });
        } else {
            this.res.status(NOT_FOUND);
            this.res.render('error/notFound', {
            });
        }
    }

    /**
     * エラーページ
     */
    public index(err: Error): void {
        this.logger.error(err.message, err.stack);

        if (this.req.xhr) {
            this.res.status(INTERNAL_SERVER_ERROR).json({
                success: false,
                message: err.message
            });
        } else {
            this.res.status(INTERNAL_SERVER_ERROR);
            this.res.render('error/error', {
                message: err.message,
                error: err
            });
        }
    }
}
