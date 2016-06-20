import mongoose = require('mongoose');

/**
 * 作品スキーマ
 */
let FilmSchema = new mongoose.Schema({
    'name': { 
        type: String,
    },
    'name_en': { 
        type: String,
    },
    'film_min': { 
        type: Number,
    },
    'genre': [
         {
            "type": { 
                type: String,
            },
            "name": { 
                type: String,
            },
            "name_en": { 
                type: String,
            },
        },
    ],
    'created_user': { 
        type: String,
    },
    'updated_user': { 
        type: String,
    },
},{
    collection: 'films',
    timestamps: { 
        createdAt: 'created_dt',
        updatedAt: 'updated_dt',
    }
});

export default FilmSchema;