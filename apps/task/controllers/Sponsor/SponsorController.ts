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

        fs.readFile(`${process.cwd()}/data/sponsors.json`, 'utf8', (err, data) => {
            if (err) throw err;
            let sponsors = JSON.parse(data);

            // パスワードハッシュ化
            sponsors = sponsors.map((sponsor) => {
                let password_salt = Util.createToken();
                sponsor['password_salt'] = password_salt;
                sponsor['password_hash'] = Util.createHash(sponsor.password, password_salt);
                delete sponsor['password'];
                return sponsor;
            });
            this.logger.info('removing all sponsors...');
            Models.Sponsor.remove({}, (err) => {
                this.logger.debug('creating sponsors...');
                Models.Sponsor.create(
                    sponsors,
                    (err) => {
                        this.logger.info('sponsors created.', err);
                        mongoose.disconnect();
                        process.exit(0);
                    }
                );
            });
        });
    }
}
