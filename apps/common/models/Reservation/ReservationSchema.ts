import mongoose = require('mongoose');

/**
 * 予約スキーマ
 */
let ReservationSchema = new mongoose.Schema({
    'token': { 
        type: String,
    },
    'payment_no': { 
        type: String,
    },

    'performance': { 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Performance'
    },
    'status': { 
        type: String,
    },
    'performance_day': { 
        type: String,
    },
    'performance_start_time': { 
        type: String,
    },
    'performance_end_time': { 
        type: String,
    },

    'theater': { 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Theater'
    },
    'theater_name': { 
        type: String,
    },
    'screen': { 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Screen'
    },
    'screen_name': { 
        type: String,
    },
    'film': { 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Film'
    },
    'film_name': { 
        type: String,
    },

    'purchaser_last_name': { 
        type: String,
    },
    'purchaser_first_name': { 
        type: String,
    },
    'purchaser_email': { 
        type: String,
    },
    'purchaser_tel': { 
        type: String,
    },

    'seat_code': { 
        type: String,
    },
    'ticket_type': { 
        type: String,
    },
    'ticket_name': { 
        type: String,
    },
    'ticket_price': { 
        type: Number,
    },
    'watcher_name': { 
        type: String,
    },

    'sponsor': { 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Sponsor'
    },
    'sponsor_user_id': { 
        type: String,
    },

    'created_user': { 
        type: String,
    },
    'updated_user': { 
        type: String,
    },
},{
    collection: 'reservations',
    timestamps: { 
        createdAt: 'created_dt',
        updatedAt: 'updated_dt',
    }
});

export default ReservationSchema;