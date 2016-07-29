"use strict";
var mongoose = require('mongoose');
/**
 * 作品スキーマ
 */
var FilmSchema = new mongoose.Schema({
    name: String,
    name_en: String,
    film_min: String,
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
    director: String,
    director_en: String,
    actor: String,
    actor_en: String,
    created_user: String,
    updated_user: String,
}, {
    collection: 'films',
    timestamps: {
        createdAt: 'created_dt',
        updatedAt: 'updated_dt',
    }
});
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = FilmSchema;
