import mongoose = require('mongoose');

/**
 * パフォーマンススキーマ
 */
let PerformanceSchema = new mongoose.Schema({
    "theater": { 
        type: mongoose.Schema.Types.ObjectId,
        ref: "Theater"
    },
    "screen": { 
        type: mongoose.Schema.Types.ObjectId,
        ref: "Screen"
    },
    "film": { 
        type: mongoose.Schema.Types.ObjectId,
        ref: "Film"
    },
    "day": {
        type: String
    },
    "start_time": {
        type: String
    },
    "end_time": {
        type: String
    },
    "seats": [
        {
            "code": {
                type: String
            },
            "tickets": [
                {
                    "type": {
                        type: String
                    },
                    "name": {
                        type: String
                    },
                    "name_en": {
                        type: String
                    },
                    "price": {
                        type: String
                    },
                }
            ],
        }
    ],
    "created_user": {
        type: String
    },
    "updated_user": {
        type: String
    },
},{
    collection: "performances",
    timestamps: { 
        createdAt: "created_dt",
        updatedAt: "updated_dt",
    }
});

export default PerformanceSchema;