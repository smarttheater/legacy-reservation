/**
 * 座席予約券種選択フォーム
 */
import { Request } from 'express';
export default (req: Request): void => {
    // choices
    req.checkBody('choices')
        .notEmpty();
};
