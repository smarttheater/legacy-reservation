"use strict";
const mongoose = require('mongoose');
/**
 * GMO結果通知スキーマ
 */
let Schema = new mongoose.Schema({
    shop_id: String,
    order_id: String,
    status: String,
    job_cd: String,
    amount: String,
    pay_type: String,
    processed: Boolean // 処理済フラグ(TIFF側で決済ステータスを変更して、メール送信まで完了したかどうか)
}, {
    collection: 'gmo_notifications',
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    }
});
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Schema;
