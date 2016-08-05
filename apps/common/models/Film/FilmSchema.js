"use strict";
const mongoose = require('mongoose');
/**
 * 作品スキーマ
 */
let FilmSchema = new mongoose.Schema({
    name: String,
    name_en: String,
    sections: [
        {
            _id: false,
            code: String,
            name: String,
            name_en: String,
        },
    ],
    genres: [
        {
            _id: false,
            code: String,
            name: String,
            name_en: String,
        },
    ],
    ticket_type_group: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TicketTypeGroup'
    },
    image: String,
    created_user: String,
    updated_user: String,
}, {
    collection: 'films',
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    }
});
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = FilmSchema;
