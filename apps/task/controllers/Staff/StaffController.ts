import BaseController from '../BaseController';
import Constants from '../../../common/Util/Constants';
import Util from '../../../common/Util/Util';
import Models from '../../../common/models/Models';
import conf = require('config');
import mongoose = require('mongoose');
import fs = require('fs-extra');

let MONGOLAB_URI = conf.get<string>('mongolab_uri');

export default class StaffController extends BaseController {
    public createFromJson(): void {
        mongoose.connect(MONGOLAB_URI, {});

        fs.readFile(`${process.cwd()}/data/${process.env.NODE_ENV}/staffs.json`, 'utf8', (err, data) => {
            if (err) throw err;
            let staffs = JSON.parse(data);

            // パスワードハッシュ化
            staffs = staffs.map((staff) => {
                let password_salt = Util.createToken();
                staff['password_salt'] = password_salt;
                staff['password_hash'] = Util.createHash(staff.password, password_salt);
                delete staff['password'];
                return staff;
            });
            this.logger.info('removing all staffs...');
            Models.Staff.remove({}, (err) => {
                this.logger.debug('creating staffs...');
                Models.Staff.create(
                    staffs,
                    (err) => {
                        this.logger.info('staffs created.', err);
                        mongoose.disconnect();
                        process.exit(0);
                    }
                );
            });
        });
    }
}
