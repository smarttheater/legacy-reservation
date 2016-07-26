import mongoose = require('mongoose');

/**
 * 予約スキーマ
 */
let ReservationSchema = new mongoose.Schema({
    token: String,
    payment_no: String,

    performance: { 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Performance'
    },
    status: String,
    performance_day: String,
    performance_start_time: String,
    performance_end_time: String,

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
    film_name:String,
    film_name_en:String,

    purchaser_last_name: String,
    purchaser_first_name: String,
    purchaser_email: String,
    purchaser_tel: String,

    seat_code: String,
    ticket_type: String,
    ticket_name: String,
    ticket_name_en: String,
    ticket_price: String,
    watcher_name: String,

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

    created_user: String,
    updated_user: String,
},{
    collection: 'reservations',
    timestamps: { 
        createdAt: 'created_dt',
        updatedAt: 'updated_dt',
    }
});

export default ReservationSchema;