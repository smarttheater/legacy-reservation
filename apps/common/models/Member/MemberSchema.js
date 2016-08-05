"use strict";
const mongoose = require('mongoose');
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
}, {
    collection: 'members',
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    }
});
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = MemberSchema;
