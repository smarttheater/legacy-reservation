"use strict";
const mongoose = require('mongoose');
const ReservationUtil_1 = require('./ReservationUtil');
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
    purchaser_group: String,
    purchaser_last_name: String,
    purchaser_first_name: String,
    purchaser_email: String,
    purchaser_tel: String,
    purchased_at: Date,
    payment_method: String,
    seat_grade_name_ja: String,
    seat_grade_name_en: String,
    seat_grade_additional_charge: Number,
    ticket_type_code: String,
    ticket_type_name_ja: String,
    ticket_type_name_en: String,
    ticket_type_charge: Number,
    watcher_name: String,
    watcher_name_updated_at: Date,
    payment_no: String,
    total_charge: Number,
    charge: Number,
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
    entered: {
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
}, {
    collection: 'reservations',
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
});
// 開始文字列を表示形式で取得できるように
Schema.virtual('performance_start_str').get(function () {
    return `${this.performance_day.substr(0, 4)}/${this.performance_day.substr(4, 2)}/${this.performance_day.substr(6)} ${this.performance_start_time.substr(0, 2)}:${this.performance_start_time.substr(2)}`;
});
Schema.virtual('baloon_content4staff').get(function () {
    let str = `${this.seat_code}`;
    str += (this.purchaser_group_str) ? `<br>${this.purchaser_group_str}` : '';
    str += (this.purchaser_name) ? `<br>${this.purchaser_name}` : '';
    str += (this.status_str) ? `<br>${this.status_str}` : '';
    return str;
});
Schema.virtual('purchaser_name').get(function () {
    let name = '';
    if (this.status === ReservationUtil_1.default.STATUS_RESERVED) {
        switch (this.purchaser_group) {
            case ReservationUtil_1.default.PURCHASER_GROUP_STAFF:
                name = this.staff_name;
                break;
            default:
                name = `${this.purchaser_last_name} ${this.purchaser_first_name}`;
                break;
        }
    }
    return name;
});
Schema.virtual('purchaser_group_str').get(function () {
    let str = '';
    switch (this.purchaser_group) {
        case ReservationUtil_1.default.PURCHASER_GROUP_CUSTOMER:
            str = '一般';
            break;
        case ReservationUtil_1.default.PURCHASER_GROUP_MEMBER:
            str = 'メルマガ先行会員';
            break;
        case ReservationUtil_1.default.PURCHASER_GROUP_SPONSOR:
            str = '外部関係者';
            break;
        case ReservationUtil_1.default.PURCHASER_GROUP_STAFF:
            str = '内部関係者';
            break;
        case ReservationUtil_1.default.PURCHASER_GROUP_TEL:
            str = '電話窓口';
            break;
        case ReservationUtil_1.default.PURCHASER_GROUP_WINDOW:
            str = '当日窓口';
            break;
        default:
            break;
    }
    return str;
});
Schema.virtual('status_str').get(function () {
    let str = '';
    switch (this.status) {
        case ReservationUtil_1.default.STATUS_RESERVED:
            str = '予約済';
            break;
        case ReservationUtil_1.default.STATUS_TEMPORARY:
        case ReservationUtil_1.default.STATUS_TEMPORARY_ON_KEPT_BY_TIFF:
            str = '仮予約中';
            break;
        case ReservationUtil_1.default.STATUS_WAITING_SETTLEMENT:
            str = '決済中';
            break;
        case ReservationUtil_1.default.STATUS_KEPT_BY_TIFF:
            str = 'TIFF確保中';
            break;
        default:
            break;
    }
    return str;
});
Schema.index({
    performance: 1,
    seat_code: 1
}, {
    unique: true
});
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Schema;
