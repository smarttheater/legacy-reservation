import mongoose = require('mongoose');

/**
 * メルマガ会員スキーマ
 */
let MemberSchema = new mongoose.Schema({
    user_id: String,
    password: String,
    performance: { 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Performance'
    },
    seat_code: String,
},{
    collection: 'members',
    timestamps: { 
        createdAt: 'created_dt',
        updatedAt: 'updated_dt',
    }
});

export default MemberSchema;