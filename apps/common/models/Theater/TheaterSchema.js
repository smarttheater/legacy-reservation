"use strict";
const mongoose = require('mongoose');
/**
 * 劇場スキーマ
 */
let Schema = new mongoose.Schema({
    _id: String,
    name: String,
    name_en: String,
    address: String,
    tel: String,
    fax: String,
    created_user: String,
    updated_user: String,
}, {
    collection: 'theaters',
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    }
});
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Schema;
