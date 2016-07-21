"use strict";
var mongoose = require('mongoose');
/**
 * 劇場スキーマ
 */
var TheaterSchema = new mongoose.Schema({
    name: String,
    name_en: String,
    address: String,
    tel_no: String,
    fax_no: String,
    created_user: String,
    updated_user: String,
}, {
    collection: 'theaters',
    timestamps: {
        createdAt: 'created_dt',
        updatedAt: 'updated_dt',
    }
});
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TheaterSchema;
