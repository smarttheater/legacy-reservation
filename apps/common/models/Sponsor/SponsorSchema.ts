import mongoose = require('mongoose');

/**
 * 外部関係者スキーマ
 */
let SponsorSchema = new mongoose.Schema({
    'user_id': { 
        type: String,
    },
    'password': { 
        type: String,
    },
    "film": { 
        type: mongoose.Schema.Types.ObjectId,
        ref: "Film"
    },
    'max_reservation_count': { 
        type: Number,
    },
    'created_user': { 
        type: String,
    },
    'updated_user': { 
        type: String,
    },
},{
    collection: 'sponsors',
    timestamps: { 
        createdAt: 'created_dt',
        updatedAt: 'updated_dt',
    }
});

export default SponsorSchema;