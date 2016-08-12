import mongoose = require('mongoose');

/**
 * パフォーマンススキーマ
 */
let Schema = new mongoose.Schema({
    _id: String, // day + screen + start_time
    theater: { 
        type: String,
        ref: 'Theater'
    },
    screen: { 
        type: String,
        ref: 'Screen'
    },
    film: { 
        type: String,
        ref: 'Film'
    },
    day: String, // 上映日
    start_time: String, // 上映開始時刻
    end_time: String, // 上映終了時刻
    is_mx4d: Boolean, // MX4D上映かどうか
    created_user:String,
    updated_user: String,
},{
    collection: 'performances',
    timestamps: { 
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    }
});

export default Schema;