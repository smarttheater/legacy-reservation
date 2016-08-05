"use strict";
const mongoose = require('mongoose');
/**
 * 予約完了メール送信キュースキーマ
 */
let Schema = new mongoose.Schema({
    payment_no: String,
    is_sent: Boolean // 送信済みフラグ
}, {
    collection: 'reservation_email_cues',
});
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Schema;
