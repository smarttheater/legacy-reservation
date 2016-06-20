import mongoose = require('mongoose');

/**
 * パフォーマンス座席スキーマ
 */
let PerformanceSeatSchema = new mongoose.Schema({
    'code': { 
        type: String,
    },
    'status': { 
        type: String,
    },
    'performance': { 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Performance'
    },
    'tickets': [
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
                type: Number
            },
        }
    ],
    'created_user': { 
        type: String,
    },
    'updated_user': { 
        type: String,
    },
},{
    collection: 'performance_seats',
    timestamps: { 
        createdAt: 'created_dt',
        updatedAt: 'updated_dt',
    }
});

export default PerformanceSeatSchema;