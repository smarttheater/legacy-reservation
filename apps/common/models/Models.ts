let mongoose = require('mongoose')
  , Schema = mongoose.Schema

let PerformanceSchema = new mongoose.Schema({
    'theater_id': { 
        type: String,
    },
    'screen_id': { 
        type: String,
    },
    'film_id': { 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Film'
    },
    'day': { 
        type: String,
    },
    'start_time': { 
        type: String,
    },
    'end_time': { 
        type: String, 
    },
    'ticket': [
        {
            "type": {
                type: String
            },
            "name": {
                type: String
            },
            "name_en": {
                type: String
            },
            "sales_price": {
                type: Number
            },
        }
    ],
},{
    collection: 'performance',
    timestamps: { 
        createdAt: 'created_dt',
        updatedAt: 'updated_dt',
    }
});

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

let Film = mongoose.model('Film', FilmSchema);
let Performance = mongoose.model('Performance', PerformanceSchema);

export {Film, Performance};

