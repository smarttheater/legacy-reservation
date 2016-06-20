import mongoose = require('mongoose');

/**
 * 劇場スキーマ
 */
let TheaterSchema = new mongoose.Schema({
    'name': { 
        type: String,
    },
    'name_en': { 
        type: String,
    },
    'address': { 
        type: String,
    },
    'tel_no': { 
        type: String,
    },
    'fax_no': { 
        type: String,
    },
    'created_user': { 
        type: String,
    },
    'updated_user': { 
        type: String,
    },
},{
    collection: 'theater',
    timestamps: { 
        createdAt: 'created_dt',
        updatedAt: 'updated_dt',
    }
});

export default TheaterSchema;