import mongoose = require('mongoose');

/**
 * 外部関係者スキーマ
 */
let SponsorSchema = new mongoose.Schema({
    user_id: String,
    password: String,
    name: String,
    email: String,
    film: { 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Film'
    },
    max_reservation_count: Number,
    created_user: String,
    updated_user: String,
},{
    collection: 'sponsors',
    timestamps: { 
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    }
});

export default SponsorSchema;