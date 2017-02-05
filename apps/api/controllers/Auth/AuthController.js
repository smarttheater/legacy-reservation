"use strict";
const BaseController_1 = require("../BaseController");
const Models_1 = require("../../../common/models/Models");
class AuthController extends BaseController_1.default {
    /**
     * ログイン
     */
    login() {
        let util = require('../../../common/Util/Util');
        let token = util.createToken();
        Models_1.default.Authentication.findOneAndUpdate({
            mvtk_kiin_cd: '00000775' // テスト用会員コード
        }, {
            token: token,
        }, {
            upsert: true,
            new: true
        }, (err, authentication) => {
            if (err) {
                this.res.json({
                    success: false,
                    access_token: null,
                    mvtk_kiin_cd: null
                });
            }
            else {
                this.res.json({
                    success: true,
                    access_token: authentication.get('token'),
                    mvtk_kiin_cd: authentication.get('mvtk_kiin_cd') // テスト用会員コード
                });
            }
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AuthController;
