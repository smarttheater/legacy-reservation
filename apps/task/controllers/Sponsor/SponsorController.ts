import BaseController from '../BaseController';
import Constants from '../../../common/Util/Constants';
import Util from '../../../common/Util/Util';
import Models from '../../../common/models/Models';
import conf = require('config');
import mongoose = require('mongoose');
import fs = require('fs-extra');

let MONGOLAB_URI = conf.get<string>('mongolab_uri');

export default class SponsorController extends BaseController {
    public createFromJson(): void {
        mongoose.connect(MONGOLAB_URI, {});

        fs.readFile(`${process.cwd()}/data/${process.env.NODE_ENV}/sponsors.json`, 'utf8', (err, data) => {
            if (err) throw err;
            let sponsors = JSON.parse(data);

            // パスワードハッシュ化
            sponsors = sponsors.map((sponsor) => {
                let password_salt = Util.createToken();
                sponsor['password_salt'] = password_salt;
                sponsor['password_hash'] = Util.createHash(sponsor.password, password_salt);
                return sponsor;
            });

            // あれば更新、なければ追加
            let promises = sponsors.map((sponsor) => {
                return new Promise((resolve, reject) => {
                    this.logger.debug('updating sponsor...');
                    Models.Sponsor.update(
                        {
                            user_id: sponsor.user_id
                        },
                        sponsor,
                        {
                            upsert: true
                        },
                        (err, raw) => {
                            this.logger.debug('sponsor updated', err, raw);
                            if (err) {
                                reject(err);
                            } else {
                                resolve();
                            }
                        }
                    );
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
