import mongoose = require('mongoose');

/**
 * メルマガ会員スキーマ
 */
let MemberSchema = new mongoose.Schema({
    'user_id': { 
        type: String,
    },
    'password': { 
        type: String,
    },
    'performance': { 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Performance'
    },
    'seat_code': { 
        type: String,
    },
},{
    collection: 'members',
    timestamps: { 
        createdAt: 'created_dt',
        updatedAt: 'updated_dt',
    }
});

export default MemberSchema;