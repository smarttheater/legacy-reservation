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
    end_time: String // 上映終了時刻
}, {
    collection: 'performances',
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    }
});
// 開始文字列を表示形式で取得できるように
Schema.virtual('start_str').get(function () {
    return `${this.day.substr(0, 4)}/${this.day.substr(4, 2)}/${this.day.substr(6)} ${this.start_time.substr(0, 2)}:${this.start_time.substr(2)}`;
});
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Schema;
