import mongoose = require('mongoose');

/**
 * 予約スキーマ
 */
let ReservationSchema = new mongoose.Schema({
    'performance': { 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Performance'
    },
    'created_user': { 
        type: String,
    },
    'updated_user': { 
        type: String,
    },
},{
    collection: 'reservation',
    timestamps: { 
        createdAt: 'created_dt',
        updatedAt: 'updated_dt',
    }
});

export default ReservationSchema;