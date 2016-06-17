let mongoose = require('mongoose');

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
},{
    collection: 'film',
    timestamps: { 
        createdAt: 'created_dt',
        updatedAt: 'updated_dt',
    }
});

export default FilmSchema;