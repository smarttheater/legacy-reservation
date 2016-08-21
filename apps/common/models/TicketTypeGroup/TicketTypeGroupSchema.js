"use strict";
const mongoose = require('mongoose');
/**
 * 券種グループスキーマ
 */
let Schema = new mongoose.Schema({
    _id: String,
    name: {
        ja: String,
        en: String,
    },
    types: [
        {
            _id: false,
            code: String,
            name: {
                ja: String,
                en: String // 券種名(英語)
            },
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
