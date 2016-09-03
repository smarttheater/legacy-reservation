import BaseController from '../BaseController';
import Util from '../../../common/Util/Util';
import Models from '../../../common/models/Models';
import conf = require('config');
import mongodb = require('mongodb');
import mongoose = require('mongoose');
import fs = require('fs-extra');

let MONGOLAB_URI = conf.get<string>('mongolab_uri');

export default class TestController extends BaseController {
    public createWindows(): void {
        mongoose.connect(MONGOLAB_URI, {});

        fs.readFile(`${process.cwd()}/data/${process.env.NODE_ENV}/windows.json`, 'utf8', (err, data) => {
            if (err) throw err;
            let windows = JSON.parse(data);

            // パスワードハッシュ化
            windows = windows.map((window) => {
                let password_salt = Util.createToken();
                window['password_salt'] = password_salt;
                window['password_hash'] = Util.createHash(window.password, password_salt);
                delete window['password'];
                return window;
            });
            this.logger.info('removing all windows...');
            Models.Window.remove({}, (err) => {
                this.logger.debug('creating windows...');
                Models.Window.create(
                    windows,
                    (err) => {
                        this.logger.info('windows created.', err);
                        mongoose.disconnect();
                        process.exit(0);
                    }
                );
            });
        });
    }

    public createTelStaffs(): void {
        mongoose.connect(MONGOLAB_URI, {});

        fs.readFile(`${process.cwd()}/data/${process.env.NODE_ENV}/telStaffs.json`, 'utf8', (err, data) => {
            if (err) throw err;
            let telStaffs = JSON.parse(data);

            // パスワードハッシュ化
            telStaffs = telStaffs.map((telStaff) => {
                let password_salt = Util.createToken();
                telStaff['password_salt'] = password_salt;
                telStaff['password_hash'] = Util.createHash(telStaff.password, password_salt);
                delete telStaff['password'];
                return telStaff;
            });
            this.logger.info('removing all telStaffs...');
            Models.TelStaff.remove({}, (err) => {
                this.logger.debug('creating telStaffs...');
                Models.TelStaff.create(
                    telStaffs,
                    (err) => {
                        this.logger.info('telStaffs created.', err);
                        mongoose.disconnect();
                        process.exit(0);
                    }
                );
            });
        });
    }

    public createPaymentNo(): void {
        mongoose.connect(MONGOLAB_URI, {});
        Util.createPaymentNo((err, paymentNo) => {
            this.logger.info('paymentNo is', paymentNo);
            mongoose.disconnect();
            process.exit(0);
        });
    }
}
