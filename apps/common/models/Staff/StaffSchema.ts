import mongoose = require('mongoose');

/**
 * 内部関係者スキーマ
 */
let Schema = new mongoose.Schema({
    user_id: String,
    password: String,
    name: String,
    email: String,
    department_name: String,
    created_user: String,
    updated_user: String,
},{
    collection: 'staffs',
    timestamps: { 
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    }
});

export default Schema;