import mongoose = require('mongoose');

/**
 * スクリーンスキーマ
 */
let ScreenSchema = new mongoose.Schema({
    theater: { 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Theater'
    },
    name: String,
    name_en: String,
    sections: [
         {
             _id: false,
             code: String,
             name: String,
             name_en: String,
             seats: [
                 {
                     _id: false,
                     code: String, // 座席コード
                     grade: {
                         name: String, // 座席レベル名
                         name_en: String, // 座席レベル名(英語)
                         additional_charge: Number // 追加料金
                     }
                 },
             ]
        },
    ],
    created_user: String,
    updated_user: String,
},{
    collection: 'screens',
    timestamps: { 
        createdAt: 'created_dt',
        updatedAt: 'updated_dt',
    }
});

export default ScreenSchema;