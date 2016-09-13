"use strict";
const mongoose = require("mongoose");
/**
 * ログイン認証スキーマ
 */
let Schema = new mongoose.Schema({
    token: {
        type: String,
        required: true
    },
    mvtk_kiin_cd: String,
    sponsor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Sponsor'
    },
    staff: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Staff'
    },
    tel_staff: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TelStaff'
    },
    window: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Window,'
    },
    signature: String,
    locale: String // 使用言語
}, {
    collection: 'authentications',
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    }
});
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Schema;
