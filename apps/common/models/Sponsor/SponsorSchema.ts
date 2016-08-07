import mongoose = require('mongoose');

/**
 * 外部関係者スキーマ
 */
let Schema = new mongoose.Schema({
    user_id: String,
    password: String,
    name: String,
    performance: { // パフォーマンス指定
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Performance'
    },
    max_reservation_count: Number,
    created_user: String,
    updated_user: String,
},{
    collection: 'sponsors',
    timestamps: { 
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    }
});

export default Schema;