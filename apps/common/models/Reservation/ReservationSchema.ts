import mongoose = require('mongoose');

/**
 * 予約スキーマ
 */
let Schema = new mongoose.Schema({
    performance: {
        type: String,
        ref: 'Performance',
        required: true
    },
    seat_code: {
        type: String,
        required: true
    },
    status: {
        type: String,
        required: true
    },

    performance_day: String,
    performance_start_time: String,
    performance_end_time: String,

    theater: {
        type: String,
        ref: 'Theater'
    },
    theater_name_ja: String,
    theater_name_en: String,

    screen: {
        type: String,
        ref: 'Screen'
    },
    screen_name_ja: String,
    screen_name_en: String,

    film: {
        type: String,
        ref: 'Film'
    },
    film_name_ja: String,
    film_name_en: String,
    film_image: String,
    film_is_mx4d: Boolean,

    purchaser_group: String, // 購入者区分
    purchaser_last_name: String,
    purchaser_first_name: String,
    purchaser_email: String,
    purchaser_tel: String,

    purchased_at: Date, // 購入確定日時

    payment_method: String, // 決済方法

    seat_grade_name_ja: String,
    seat_grade_name_en: String,
    seat_grade_additional_charge: Number,

    ticket_type_code: String,
    ticket_type_name_ja: String,
    ticket_type_name_en: String,
    ticket_type_charge: Number,

    watcher_name: String, // 配布先
    watcher_name_updated_at: Date, // 配布先更新日時 default: Date.now

    payment_no: String,

    total_charge: Number, // 予約の合計金額(複数座席分)
    charge: Number, // 座席単体の料金

    sponsor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Sponsor'
    },
    sponsor_user_id: String,
    sponsor_name: String,
    sponsor_email: String,

    staff: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Staff'
    },
    staff_user_id: String,
    staff_name: String,
    staff_email: String,
    staff_tel: String,
    staff_signature: String,

    member: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Member'
    },
    member_user_id: String,

    window: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Window'
    },
    window_user_id: String,

    tel_staff: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TelStaff'
    },
    tel_staff_user_id: String,

    entered: { // 入場フラグ
        type: Boolean,
        default: false
    },

    gmo_shop_id: String,
    gmo_amount: String,
    gmo_tax: String,
    gmo_access_id: String,
    gmo_forward: String,
    gmo_method: String,
    gmo_approve: String,
    gmo_tran_id: String,
    gmo_tran_date: String,
    gmo_pay_type: String,
    gmo_cvs_code: String,
    gmo_cvs_conf_no: String,
    gmo_cvs_receipt_no: String,
    gmo_cvs_receipt_url: String,
    gmo_payment_term: String,
    gmo_status: String,

    created_user: String,
    updated_user: String,
},{
    collection: 'reservations',
    timestamps: { 
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
});

// 開始文字列を表示形式で取得できるように
Schema.virtual('performance_start_str').get(function() {
    return `${this.performance_day.substr(0, 4)}/${this.performance_day.substr(4, 2)}/${this.performance_day.substr(6)} ${this.performance_start_time.substr(0, 2)}:${this.performance_start_time.substr(2)}`;
});

Schema.index(
    {
        performance: 1,
        seat_code: 1
    },
    {
        unique: true
    }
);

export default Schema;