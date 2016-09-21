"use strict";
const BaseController_1 = require('../BaseController');
const Util_1 = require('../../../common/Util/Util');
const Models_1 = require('../../../common/models/Models');
const conf = require('config');
const mongoose = require('mongoose');
const fs = require('fs-extra');
let MONGOLAB_URI = conf.get('mongolab_uri');
class SponsorController extends BaseController_1.default {
    createFromJson() {
        mongoose.connect(MONGOLAB_URI, {});
        fs.readFile(`${process.cwd()}/data/${process.env.NODE_ENV}/sponsors.json`, 'utf8', (err, data) => {
            if (err)
                throw err;
            let sponsors = JSON.parse(data);
            // あれば更新、なければ追加
            let promises = sponsors.map((sponsor) => {
                // パスワードハッシュ化
                let password_salt = Util_1.default.createToken();
                sponsor['password_salt'] = password_salt;
                sponsor['password_hash'] = Util_1.default.createHash(sponsor.password, password_salt);
                return new Promise((resolve, reject) => {
                    this.logger.debug('updating sponsor...');
                    Models_1.default.Sponsor.findOneAndUpdate({
                        user_id: sponsor.user_id
                    }, sponsor, {
                        new: true,
                        upsert: true
                    }, (err) => {
                        this.logger.debug('sponsor updated', err);
                        (err) ? reject(err) : resolve();
                    });
                });
            });
            Promise.all(promises).then(() => {
                this.logger.info('promised.');
                mongoose.disconnect();
                process.exit(0);
            }, (err) => {
                this.logger.error('promised.', err);
                mongoose.disconnect();
                process.exit(0);
            });
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SponsorController;
