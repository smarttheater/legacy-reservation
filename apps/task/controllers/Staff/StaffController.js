"use strict";
const BaseController_1 = require('../BaseController');
const Util_1 = require('../../../common/Util/Util');
const Models_1 = require('../../../common/models/Models');
const conf = require('config');
const mongoose = require('mongoose');
let MONGOLAB_URI = conf.get('mongolab_uri');
class StaffController extends BaseController_1.default {
    createAll() {
        mongoose.connect(MONGOLAB_URI, {});
        Models_1.default.Staff.remove((err) => {
            let staffs = [
                {
                    user_id: 'admin',
                    name: '管理アカウント',
                    email: 'yamazaki@motionpicture.jp',
                    is_admin: true
                },
                {
                    user_id: 'hataguchi',
                    name: '制作部 akito hataguchi',
                    email: 'hataguchi@motionpicture.jp',
                    is_admin: false
                },
                {
                    user_id: 'shun',
                    name: '制作部 Shun Kato',
                    email: 'shun@motionpicture.jp',
                    is_admin: false
                },
                {
                    user_id: 'yoko',
                    name: '制作部 横山詳平',
                    email: 'yoko@motionpicture.jp',
                    is_admin: false
                },
                {
                    user_id: 'kato',
                    name: '進行管理部 加藤智也',
                    email: 'kato@motionpicture.jp',
                    is_admin: false
                },
                {
                    user_id: 'yamane',
                    name: '取締役 山根高之',
                    email: 'yamane@motionpicture.jp',
                    is_admin: false
                },
                {
                    user_id: 'nishihata',
                    name: '制作部 西畑伸一',
                    email: 'nishihata@motionpicture.jp',
                    is_admin: false
                },
                {
                    user_id: 'tsubota',
                    name: '進行管理部 坪田竜一',
                    email: 'tsubota@motionpicture.jp',
                    is_admin: false
                },
                {
                    user_id: 'umematsu',
                    name: '営業部 梅松康博',
                    email: 'umematsu@motionpicture.jp',
                    is_admin: false
                },
                {
                    user_id: 'meguro',
                    name: '進行管理部 目黒茂治',
                    email: 'meguro@motionpicture.jp',
                    is_admin: false
                },
                {
                    user_id: 'yamazaki',
                    name: '制作部 Tetsu Yamazaki',
                    email: 'yamazaki@motionpicture.jp',
                    is_admin: false
                }
            ];
            let promises = [];
            for (let staff of staffs) {
                promises.push(new Promise((resolve, reject) => {
                    let password_salt = Util_1.default.createToken();
                    staff['password_salt'] = password_salt;
                    staff['password_hash'] = Util_1.default.createHash('12345', password_salt);
                    Models_1.default.Staff.create(staff, (err) => {
                        if (err) {
                            reject(err);
                        }
                        else {
                            resolve();
                        }
                    });
                }));
            }
            Promise.all(promises).then(() => {
                this.logger.debug('success!');
                mongoose.disconnect();
                process.exit(0);
            }, (err) => {
                this.logger.debug('err:', err);
                mongoose.disconnect();
                process.exit(0);
            });
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = StaffController;
