import mongoose = require('mongoose');

/**
 * 劇場スキーマ
 */
let TheaterSchema = new mongoose.Schema({
    name: String,
    name_en: String,
    address: String,
    tel_no: String,
    fax_no: String,
    created_user: String,
    updated_user: String,
},{
    collection: 'theaters',
    timestamps: { 
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    }
});

export default TheaterSchema;