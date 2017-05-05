import { NextFunction, Request, Response } from 'express';

/**
 * ベースコントローラー
 *
 * @class BaseController
 */
export default class BaseController {
    public readonly req: Request;
    public readonly res: Response;
    public readonly next: NextFunction;

    constructor(req: Request, res: Response, next: NextFunction) {
        this.req = req;
        this.res = res;
        this.next = next;
    }
}
