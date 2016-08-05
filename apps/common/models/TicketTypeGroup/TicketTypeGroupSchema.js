"use strict";
const mongoose = require('mongoose');
/**
 * 券種グループスキーマ
 */
let Schema = new mongoose.Schema({
    name: String,
    name_en: String,
    types: [
        {
            _id: false,
            code: String,
            name: String,
            name_en: String,
            charge: Number,
            is_on_the_day: Boolean // 当日だけフラグ
        },
    ],
    created_user: String,
    updated_user: String,
}, {
    collection: 'ticket_type_groups',
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    }
});
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Schema;
