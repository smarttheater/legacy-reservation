"use strict";
const BaseController_1 = require('../BaseController');
const Util_1 = require('../../../common/Util/Util');
const Models_1 = require('../../../common/models/Models');
const conf = require('config');
const mongoose = require('mongoose');
const fs = require('fs-extra');
let MONGOLAB_URI = conf.get('mongolab_uri');
class StaffController extends BaseController_1.default {
    createFromJson() {
        mongoose.connect(MONGOLAB_URI, {});
        fs.readFile(`${process.cwd()}/data/${process.env.NODE_ENV}/staffs.json`, 'utf8', (err, data) => {
            if (err)
                throw err;
            let staffs = JSON.parse(data);
            // パスワードハッシュ化
            staffs = staffs.map((staff) => {
                let password_salt = Util_1.default.createToken();
                staff['password_salt'] = password_salt;
                staff['password_hash'] = Util_1.default.createHash(staff.password, password_salt);
                delete staff['password'];
                return staff;
            });
            this.logger.info('removing all staffs...');
            Models_1.default.Staff.remove({}, (err) => {
                this.logger.debug('creating staffs...');
                Models_1.default.Staff.create(staffs, (err) => {
                    this.logger.info('staffs created.', err);
                    mongoose.disconnect();
                    process.exit(0);
                });
            });
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = StaffController;
