import mongoose = require('mongoose');

/**
 * 券種グループスキーマ
 */
let Schema = new mongoose.Schema({
    name: String, // 券種グループ名
    name_en: String, // 券種グループ名(英語)
    types: [
         {
             _id: false,
            code: String,
            name: String, // 券種名
            name_en: String, // 券種名(英語)
            charge: Number, // 料金
            is_on_the_day: Boolean // 当日だけフラグ
        },
    ],
    created_user: String,
    updated_user: String,
},{
    collection: 'ticket_type_groups',
    timestamps: { 
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    }
});

export default Schema;