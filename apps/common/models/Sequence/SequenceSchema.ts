import mongoose = require('mongoose');

/**
 * 採番スキーマ
 */
let Schema = new mongoose.Schema({
    no: Number,
    target: String
},{
    collection: 'sequences'
});

Schema.index(
    {
        no: 1,
    },
    {
        unique: true
    }
);

export default Schema;