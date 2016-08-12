import BaseController from '../BaseController';
import Constants from '../../../common/Util/Constants';
import Util from '../../../common/Util/Util';
import Models from '../../../common/models/Models';
import conf = require('config');
import mongoose = require('mongoose');

let MONGOLAB_URI = conf.get<string>('mongolab_uri');

export default class StaffController extends BaseController {
    public createAll(): void {
        mongoose.connect(MONGOLAB_URI, {});

        Models.Staff.remove((err) => {
            let staffs = [
                {
                    user_id: 'admin',
                    name: 'Admin',
                    email: 'yamazaki@motionpicture.jp',
                    department_name: '管理アカウント',
                    is_admin: true
                },
                {
                    user_id: 'hataguchi',
                    name: 'akito hataguchi',
                    email: 'hataguchi@motionpicture.jp',
                    department_name: '制作部',
                    is_admin: false
                },
                {
                    user_id: 'shun',
                    name: 'Shun Kato',
                    email: 'shun@motionpicture.jp',
                    department_name: '制作部',
                    is_admin: false
                },
                {
                    user_id: 'yoko',
                    name: '横山詳平',
                    email: 'yoko@motionpicture.jp',
                    department_name: '制作部',
                    is_admin: false
                },
                {
                    user_id: 'kato',
                    name: '加藤智也',
                    email: 'kato@motionpicture.jp',
                    department_name: '進行管理部',
                    is_admin: false
                },
                {
                    user_id: 'yamane',
                    name: '山根高之',
                    email: 'yamane@motionpicture.jp',
                    department_name: '取締役',
                    is_admin: false
                },
                {
                    user_id: 'nishihata',
                    name: '西畑伸一',
                    email: 'nishihata@motionpicture.jp',
                    department_name: '制作部',
                    is_admin: false
                },
                {
                    user_id: 'tsubota',
                    name: '坪田竜一',
                    email: 'tsubota@motionpicture.jp',
                    department_name: '進行管理部',
                    is_admin: false
                },
                {
                    user_id: 'umematsu',
                    name: '梅松康博',
                    email: 'umematsu@motionpicture.jp',
                    department_name: '営業部',
                    is_admin: false
                },
                {
                    user_id: 'meguro',
                    name: '目黒茂治',
                    email: 'meguro@motionpicture.jp',
                    department_name: '進行管理部',
                    is_admin: false
                },
                {
                    user_id: 'yamazaki',
                    name: 'Tetsu Yamazaki',
                    email: 'yamazaki@motionpicture.jp',
                    department_name: '制作部',
                    is_admin: false
                }
            ];


            let promises = [];
            for (let staff of staffs) {
                promises.push(new Promise((resolve, reject) => {
                    let password_salt = Util.createToken();
                    staff['password_salt'] = password_salt;
                    staff['password_hash'] = Util.createHash('12345', password_salt);

                    Models.Staff.create(
                        staff,
                        (err) => {
                            if (err) {
                                reject(err);
                            } else {
                                resolve();
                            }
                        }
                    );
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
