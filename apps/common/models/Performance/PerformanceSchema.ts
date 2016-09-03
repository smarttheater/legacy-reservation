import mongoose = require('mongoose');

/**
 * パフォーマンススキーマ
 */
let Schema = new mongoose.Schema({
    _id: String, // day + screen + start_time
    theater: { 
        type: String,
        ref: 'Theater'
    },
    theater_name: {
        ja: String,
        en: String,
    },
    screen: { 
        type: String,
        ref: 'Screen'
    },
    screen_name: {
        ja: String,
        en: String,
    },
    film: { 
        type: String,
        ref: 'Film'
    },
    day: String, // 上映日
    open_time: String, // 開演時刻
    start_time: String, // 上映開始時刻
    end_time: String // 上映終了時刻
},{
    collection: 'performances',
    timestamps: { 
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    }
});

// 開始文字列を表示形式で取得できるように
Schema.virtual('start_str').get(function() {
    return `${this.day.substr(0, 4)}/${this.day.substr(4, 2)}/${this.day.substr(6)} ${this.start_time.substr(0, 2)}:${this.start_time.substr(2)}`;
});

Schema.index(
    {
        day: 1,
        start_time: 1
    }
);

export default Schema;