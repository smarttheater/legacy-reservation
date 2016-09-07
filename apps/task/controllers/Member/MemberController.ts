import BaseController from '../BaseController';
import Util from '../../../common/Util/Util';
import Models from '../../../common/models/Models';
import moment = require('moment');
import conf = require('config');
import mongoose = require('mongoose');
import fs = require('fs-extra');

let MONGOLAB_URI = conf.get<string>('mongolab_uri');

export default class MemberController extends BaseController {
    public createFromJson() {
        mongoose.connect(MONGOLAB_URI, {});

        fs.readFile(`${process.cwd()}/data/${process.env.NODE_ENV}/members.json`, 'utf8', (err, data) => {
            if (err) throw err;
            let members = JSON.parse(data);

            // パスワードハッシュ化
            members = members.map((member) => {
                let password_salt = Util.createToken();
                return {
                    "user_id": member.user_id,
                    "password_salt": password_salt,
                    "password_hash": Util.createHash(member.password, password_salt)
                };
            });
            this.logger.info('removing all members...');
            Models.Member.remove({}, (err) => {
                this.logger.debug('creating members...');
                Models.Member.create(
                    members,
                    (err) => {
                        this.logger.info('members created.', err);
                        mongoose.disconnect();
                        process.exit(0);
                    }
                );
            });
        });
    }

    public createReservationsFromJson() {
        mongoose.connect(MONGOLAB_URI, {});

        fs.readFile(`${process.cwd()}/data/${process.env.NODE_ENV}/memberReservations.json`, 'utf8', (err, data) => {
            if (err) throw err;
            let reservations = JSON.parse(data);

            this.logger.debug('creating reservations...');
            Models.Reservation.create(
                reservations,
                (err) => {
                    this.logger.info('reservations created.', err);
                    mongoose.disconnect();
                    process.exit(0);
                }
            );
        });
    }
}
