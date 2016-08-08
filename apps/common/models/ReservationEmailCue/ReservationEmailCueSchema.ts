import mongoose = require('mongoose');

/**
 * 予約完了メール送信キュースキーマ
 */
let Schema = new mongoose.Schema({
    payment_no: { // 購入番号
        type: String,
        unique: true
    },
    is_sent: Boolean // 送信済みフラグ
},{
    collection: 'reservation_email_cues',
});

export default Schema;