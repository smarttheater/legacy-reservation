"use strict";
const mongoose = require('mongoose');
/**
 * パフォーマンススキーマ
 */
let PerformanceSchema = new mongoose.Schema({
    theater: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Theater'
    },
    screen: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Screen'
    },
    film: {
        type: mongoose.Schema.Types.ObjectId,
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
exports.default = PerformanceSchema;
