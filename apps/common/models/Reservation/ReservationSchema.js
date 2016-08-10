"use strict";
const mongoose = require('mongoose');
/**
 * 予約スキーマ
 */
let Schema = new mongoose.Schema({
    token: String,
    payment_no: String,
    total_charge: Number,
    charge: Number,
    performance: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Performance'
    },
    status: String,
    performance_day: String,
    performance_start_time: String,
    performance_end_time: String,
    performance_is_mx4d: Boolean,
    theater: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Theater'
    },
    theater_name: String,
    theater_name_en: String,
    screen: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Screen'
    },
    screen_name: String,
    screen_name_en: String,
    film: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Film'
    },
    film_name: String,
    film_name_en: String,
    purchaser_group: String,
    purchaser_last_name: String,
    purchaser_first_name: String,
    purchaser_email: String,
    purchaser_tel: String,
    payment_method: String,
    seat_code: String,
    seat_grade_name: String,
    seat_grade_name_en: String,
    seat_grade_additional_charge: Number,
    ticket_type_code: String,
    ticket_type_name: String,
    ticket_type_name_en: String,
    ticket_type_charge: Number,
    watcher_name: String,
    watcher_name_updated_at: Date,
    mvtk_kiin_cd: String,
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
    staff_department_name: String,
    staff_tel: String,
    staff_signature: String,
    member: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Member'
    },
    member_user_id: String,
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
Schema.index({
    performance: 1,
    seat_code: 1
}, {
    unique: true
});
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Schema;
