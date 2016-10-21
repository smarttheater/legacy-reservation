"use strict";
const mongoose = require('mongoose');
/**
 * 予約完了メール送信キュースキーマ
 */
let Schema = new mongoose.Schema({
    payment_no: {
        type: String,
        unique: true,
        required: true
    },
    is_sent: {
        type: Boolean,
        default: false,
        required: true
    }
}, {
    collection: 'reservation_email_cues',
});
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Schema;
