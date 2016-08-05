"use strict";
const mongoose = require('mongoose');
/**
 * API認証スキーマ
 */
let Schema = new mongoose.Schema({
    token: String,
    mvtk_kiin_cd: String
}, {
    collection: 'authentications',
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    }
});
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Schema;
