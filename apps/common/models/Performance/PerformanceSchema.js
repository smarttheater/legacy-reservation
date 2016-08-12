"use strict";
const mongoose = require('mongoose');
/**
 * パフォーマンススキーマ
 */
let Schema = new mongoose.Schema({
    _id: String,
    theater: {
        type: String,
        ref: 'Theater'
    },
    screen: {
        type: String,
        ref: 'Screen'
    },
    film: {
        type: String,
        ref: 'Film'
    },
    day: String,
    start_time: String,
    end_time: String,
    is_mx4d: Boolean,
    created_user: String,
    updated_user: String,
}, {
    collection: 'performances',
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    }
});
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Schema;
