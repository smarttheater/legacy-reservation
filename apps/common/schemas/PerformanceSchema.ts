import mongoose = require('mongoose');

let PerformanceSchema = new mongoose.Schema({
    'theater': { 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Theater'
    },
    'screen': { 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Screen'
    },
    'film': { 
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
    'tickets': [
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
    'created_user': { 
        type: String,
    },
    'updated_user': { 
        type: String,
    },
},{
    collection: 'performance',
    timestamps: { 
        createdAt: 'created_dt',
        updatedAt: 'updated_dt',
    }
});

export default PerformanceSchema;