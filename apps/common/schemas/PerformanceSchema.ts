import mongoose = require('mongoose');

/**
 * パフォーマンススキーマ
 */
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