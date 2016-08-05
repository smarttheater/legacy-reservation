"use strict";
const mongoose = require('mongoose');
/**
 * スクリーンスキーマ
 */
let Schema = new mongoose.Schema({
    theater: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Theater'
    },
    name: String,
    name_en: String,
    sections: [
        {
            _id: false,
            code: String,
            name: String,
            name_en: String,
            seats: [
                {
                    _id: false,
                    code: String,
                    grade: {
                        name: String,
                        name_en: String,
                        additional_charge: Number // 追加料金
                    }
                },
            ]
        },
    ],
    created_user: String,
    updated_user: String,
}, {
    collection: 'screens',
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    }
});
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Schema;
