import mongoose = require('mongoose');

/**
 * 作品スキーマ
 */
let Schema = new mongoose.Schema({
    _id: String,
    name: {
        type: {
            ja: String,
            en: String
        },
        required: true
    },
    sections: [
         {
             _id: false,
            code: String,
            name: {
                ja: String,
                en: String
            }
        },
    ],
    ticket_type_group: { 
        type: String,
        ref: 'TicketTypeGroup',
        required: true
    },
    image: String,
    minutes: Number, // 上映時間
    is_mx4d: Boolean // MX4D上映かどうか
},{
    collection: 'films',
    timestamps: { 
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    }
});

export default Schema;