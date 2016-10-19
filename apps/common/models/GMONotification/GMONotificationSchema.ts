import mongoose = require('mongoose');

/**
 * GMO結果通知スキーマ
 */
let Schema = new mongoose.Schema({
    shop_id: String, // ショップID
    order_id: String, // オーダーID
    status: String, // 結果ステータス
    job_cd: String, // 処理区分
    amount: String, // 利用金額
    pay_type: String, // 決済方法
    processed: Boolean // 処理済フラグ(TIFF側で決済ステータスを変更して、メール送信まで完了したかどうか)
},{
    collection: 'gmo_notifications',
    timestamps: { 
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    }
});

export default Schema;