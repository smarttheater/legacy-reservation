import mongoose = require('mongoose');

/**
 * 内部関係者スキーマ
 */
let Schema = new mongoose.Schema({
    user_id: {
        type: String,
        unique: true
    },
    password_salt: String,
    password_hash: String,
    name: String,
    email: String,
    department_name: String
},{
    collection: 'staffs',
    timestamps: { 
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    }
});

export default Schema;