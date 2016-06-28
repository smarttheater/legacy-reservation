import mongoose = require('mongoose');

/**
 * 内部関係者スキーマ
 */
let StaffSchema = new mongoose.Schema({
    'user_id': { 
        type: String,
    },
    'password': { 
        type: String,
    },
    'name': { 
        type: String,
    },
    'email': { 
        type: String,
    },
    'department_name': { 
        type: String,
    },
    'created_user': { 
        type: String,
    },
    'updated_user': { 
        type: String,
    },
},{
    collection: 'staffs',
    timestamps: { 
        createdAt: 'created_dt',
        updatedAt: 'updated_dt',
    }
});

export default StaffSchema;