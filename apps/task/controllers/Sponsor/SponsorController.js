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
            // パスワードハッシュ化
            sponsors = sponsors.map((sponsor) => {
                let password_salt = Util_1.default.createToken();
                sponsor['password_salt'] = password_salt;
                sponsor['password_hash'] = Util_1.default.createHash(sponsor.password, password_salt);
                delete sponsor['password'];
                return sponsor;
            });
            this.logger.info('removing all sponsors...');
            Models_1.default.Sponsor.remove({}, (err) => {
                this.logger.debug('creating sponsors...');
                Models_1.default.Sponsor.create(sponsors, (err) => {
                    this.logger.info('sponsors created.', err);
                    mongoose.disconnect();
                    process.exit(0);
                });
            });
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SponsorController;
