import mongoose = require('mongoose');

/**
 * 在庫スキーマ
 */
let StockSchema = new mongoose.Schema({
    'seat_code': { 
        type: String,
    },
    'performance': { 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Performance'
    },
    'status': { 
        type: String,
    },
    'created_user': { 
        type: String,
    },
    'updated_user': {
        type: String,
    },
},{
    collection: 'stocks',
    timestamps: { 
        createdAt: 'created_dt',
        updatedAt: 'updated_dt',
    }
});

export default StockSchema;