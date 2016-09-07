"use strict";
const mongoose = require('mongoose');
/**
 * 採番スキーマ
 */
let Schema = new mongoose.Schema({
    no: Number,
    target: String
}, {
    collection: 'sequences'
});
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Schema;
