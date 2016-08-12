"use strict";
const mongoose = require('mongoose');
/**
 * メルマガ会員スキーマ
 */
let Schema = new mongoose.Schema({
    user_id: String,
    password: String
}, {
    collection: 'members',
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    }
});
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Schema;
