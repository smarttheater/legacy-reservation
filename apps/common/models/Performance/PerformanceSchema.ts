import mongoose = require('mongoose');

/**
 * パフォーマンススキーマ
 */
let PerformanceSchema = new mongoose.Schema({
    theater: { 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Theater'
    },
    screen: { 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Screen'
    },
    film: { 
        type: mongoose.Schema.Types.ObjectId,
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
        createdAt: 'created_dt',
        updatedAt: 'updated_dt',
    }
});

export default PerformanceSchema;