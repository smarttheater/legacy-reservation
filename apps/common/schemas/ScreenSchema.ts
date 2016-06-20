import mongoose = require('mongoose');

/**
 * スクリーンスキーマ
 */
let ScreenSchema = new mongoose.Schema({
    'theater': { 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Theater'
    },
    'name': { 
        type: String,
    },
    'name_en': { 
        type: String,
    },
    'sections': [
         {
            "code": { 
                type: String,
            },
            "name": { 
                type: String,
            },
            "name_en": { 
                type: String,
            },
            "seats": [
                {
                    "code": { 
                        type: String,
                    },
                    "enabled": { 
                        type: Boolean,
                    },
                },
            ]
        },
    ],
    'created_user': { 
        type: String,
    },
    'updated_user': { 
        type: String,
    },
},{
    collection: 'screen',
    timestamps: { 
        createdAt: 'created_dt',
        updatedAt: 'updated_dt',
    }
});

export default ScreenSchema;