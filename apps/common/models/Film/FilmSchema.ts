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
    'sections': [
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
    'genres': [
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
    'director': { 
        type: String,
    },
    'director_en': { 
        type: String,
    },
    'actor': { 
        type: String,
    },
    'actor_en': { 
        type: String,
    },
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