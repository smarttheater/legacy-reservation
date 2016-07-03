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
    day: String,
    start_time: String,
    end_time: String,
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