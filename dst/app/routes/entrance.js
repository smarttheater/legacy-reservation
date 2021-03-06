"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * 入場ルーター(開発用)
 */
const express_1 = require("express");
const entranceRouter = express_1.Router();
if (process.env.NODE_ENV !== 'production') {
    // 本番以外の環境のみ、注文入場ページへルーティング
    entranceRouter.get(/.+/, (req, res) => {
        res.sendFile(req.path, {
            root: `${__dirname}/../../../entrance`
        });
    });
}
exports.default = entranceRouter;
