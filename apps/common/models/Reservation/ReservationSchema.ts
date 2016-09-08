import mongoose = require('mongoose');
import ReservationUtil from './ReservationUtil';

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
    performance_open_time: String,
    performance_start_time: String,
    performance_end_time: String,

    theater: {
        type: String,
        ref: 'Theater'
    },
    theater_name_ja: String,
    theater_name_en: String,
    theater_address_ja: String,
    theater_address_en: String,

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
    film_copyright: String,

    purchaser_group: String, // 購入者区分
    purchaser_last_name: String,
    purchaser_first_name: String,
    purchaser_email: String,
    purchaser_tel: String,
    purchaser_age: String, // 生まれた年代
    purchaser_address: String, // 住所
    purchaser_gender: String, // 性別

    payment_no: String, // 購入番号
    payment_seat_index: Number, // 購入座席インデックス
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
    entered_at: Date, // 入場日時

    gmo_shop_pass_string: String, // GMO決済開始時に送信するチェック文字列

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

    paydesign_seq: String,
    paydesign_date: String,
    paydesign_time: String,
    paydesign_sid: String,
    paydesign_kingaku: String,
    paydesign_cvs: String,
    paydesign_scode: String,
    paydesign_fuka: String,

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

Schema.virtual('baloon_content4staff').get(function() {
    let str = `${this.seat_code}`;
    str += (this.purchaser_group_str) ? `<br>${this.purchaser_group_str}` : '';
    str += (this.purchaser_name) ? `<br>${this.purchaser_name}` : '';
    str += (this.watcher_name) ? `<br>${this.watcher_name}` : '';
    str += (this.status_str) ? `<br>${this.status_str}` : '';

    return str;
});

Schema.virtual('purchaser_name').get(function() {
    let name = '';

    if (this.status === ReservationUtil.STATUS_RESERVED) {
        switch (this.purchaser_group) {
            case ReservationUtil.PURCHASER_GROUP_STAFF:
                name = `${this.staff_name} ${this.staff_signature}`;;
                break;
            default:
                name = `${this.purchaser_last_name} ${this.purchaser_first_name}`;
                break;
        }
    }

    return name;
});

Schema.virtual('purchaser_group_str').get(function() {
    let str = '';

    switch (this.purchaser_group) {
        case ReservationUtil.PURCHASER_GROUP_CUSTOMER:
            str = '一般';
            break;
        case ReservationUtil.PURCHASER_GROUP_MEMBER:
            str = 'メルマガ先行会員';
            break;
        case ReservationUtil.PURCHASER_GROUP_SPONSOR:
            str = '外部関係者';
            break;
        case ReservationUtil.PURCHASER_GROUP_STAFF:
            str = '内部関係者';
            break;
        case ReservationUtil.PURCHASER_GROUP_TEL:
            str = '電話窓口';
            break;
        case ReservationUtil.PURCHASER_GROUP_WINDOW:
            str = '当日窓口';
            break;
        default:
            break;
    }

    return str;
});

Schema.virtual('status_str').get(function() {
    let str = '';

    switch (this.status) {
        case ReservationUtil.STATUS_RESERVED:
            str = '予約済';
            break;

        case ReservationUtil.STATUS_TEMPORARY:
        case ReservationUtil.STATUS_TEMPORARY_ON_KEPT_BY_TIFF:
            str = '仮予約中';
            break;

        case ReservationUtil.STATUS_WAITING_SETTLEMENT:
            str = '決済中';
            break;

        case ReservationUtil.STATUS_KEPT_BY_TIFF:
            str = 'TIFF確保中';
            break;

        default:
            break;
    }

    return str;
});

/**
 * QRコード文字列
 */
Schema.virtual('qr_str').get(function() {
    return `${this.payment_no}-${this.payment_seat_index}`;
});

/** TIFF確保にステータス更新するメソッド */
Schema.statics.updateStatus2keptbytiff = function(reservationIds: Array<string>, cb: (err, raw) => void): void {
    // パフォーマンス情報だけ残して、購入者情報は削除する
    let paths4set = [
        '_id', 'performance', 'seat_code', 'status', 'created_at', 'updated_at',
        'performance_day', 'performance_start_time', 'performance_end_time', 
        'theater', 'theater_name_ja', 'theater_name_en', 'theater_address_ja', 'theater_address_en', 
        'screen', 'screen_name_ja', 'screen_name_en', 
        'film', 'film_name_ja', 'film_name_en', 'film_image', 'film_is_mx4d'
    ];
    let unset = {};
    this.schema.eachPath((path) => {
        if (paths4set.indexOf(path) < 0) {
            unset[path] = '';
        }
    });

    return this.update(
        {
            _id: {$in: reservationIds}
        },
        {
            $set: {
                status: ReservationUtil.STATUS_KEPT_BY_TIFF,
            },
            $unset: unset
        },
        {
            multi: true
        },
        (err, raw) => {
            cb(err, raw);
        }
    );
};

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