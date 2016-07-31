"use strict";
const mongoose = require('mongoose');
/**
 * 内部関係者スキーマ
 */
let StaffSchema = new mongoose.Schema({
    user_id: String,
    password: String,
    name: String,
    email: String,
    department_name: String,
    created_user: String,
    updated_user: String,
}, {
    collection: 'staffs',
    timestamps: {
        createdAt: 'created_dt',
        updatedAt: 'updated_dt',
    }
});
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = StaffSchema;
