"use strict";
const mongoose = require('mongoose');
/**
 * スクリーンスキーマ
 */
let Schema = new mongoose.Schema({
    _id: String,
    theater: {
        type: String,
        ref: 'Theater'
    },
    name: {
        ja: String,
        en: String
    },
    seats_number: Number,
    sections: [
        {
            _id: false,
            code: String,
            name: {
                ja: String,
                en: String,
            },
            seats: [
                {
                    _id: false,
                    code: String,
                    grade: {
                        code: String,
                        name: {
                            ja: String,
                            en: String,
                        },
                        additional_charge: Number // 追加料金
                    }
                },
            ]
        },
    ]
}, {
    collection: 'screens',
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    }
});
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Schema;
