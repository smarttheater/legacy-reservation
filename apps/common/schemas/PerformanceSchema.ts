let mongoose = require('mongoose');

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

export default PerformanceSchema;