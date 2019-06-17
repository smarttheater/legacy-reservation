/**
 * 入場ルーター(開発用)
 */
import { Router } from 'express';

const entranceRouter = Router();

if (process.env.NODE_ENV !== 'production') {
    // 本番以外の環境のみ、注文入場ページへルーティング
    entranceRouter.get(/.+/, (req, res) => {
        res.sendFile(
            req.path,
            {
                root: `${__dirname}/../../../entrance`
            }
        );
    });
}

export default entranceRouter;
