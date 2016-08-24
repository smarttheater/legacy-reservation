import mongoose = require('mongoose');

/**
 * ログイン認証スキーマ
 */
let Schema = new mongoose.Schema({
    token: String,
    mvtk_kiin_cd: String,
    sponsor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Sponsor'
    },
    staff: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Staff'
    },
    tel_staff: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TelStaff'
    },
    window: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Window,'
    },
    signature: String, // 署名
    locale: String // 使用言語
},{
    collection: 'authentications',
    timestamps: { 
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    }
});

export default Schema;