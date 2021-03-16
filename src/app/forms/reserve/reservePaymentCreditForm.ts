/**
 * 座席予約購入者情報フォーム
 */
import { Request } from 'express';

export default (req: Request) => {
    req.checkBody('gmoTokenObject').notEmpty();
};
