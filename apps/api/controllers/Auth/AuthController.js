"use strict";
const BaseController_1 = require('../BaseController');
const Models_1 = require('../../../common/models/Models');
const Util_1 = require('../../../common/Util/Util');
class AuthController extends BaseController_1.default {
    /**
     * ログイン
     */
    login() {
        if (this.req.method === 'POST') {
            let token = Util_1.default.createToken();
            Models_1.default.Authentication.findOneAndUpdate({
                mvtk_kiin_cd: '00000775' // テスト用会員コード
            }, {
                token: token,
            }, {
                upsert: true
            }, (err, authentication) => {
                if (err) {
                    this.res.json({
                        isSuccess: false,
                        accessToken: null,
                        mvtk_kiin_cd: null
                    });
                }
                else {
                    this.res.json({
                        isSuccess: true,
                        accessToken: authentication.get('token'),
                        mvtk_kiin_cd: authentication.get('mvtk_kiin_cd') // テスト用会員コード
                    });
                }
            });
        }
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AuthController;
