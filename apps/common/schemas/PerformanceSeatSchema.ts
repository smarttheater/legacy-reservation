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
            "sales_price": {
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
    collection: 'theater',
    timestamps: { 
        createdAt: 'created_dt',
        updatedAt: 'updated_dt',
    }
});

export default PerformanceSeatSchema;