"use strict";
const BaseController_1 = require('../BaseController');
const mvtkService = require('@motionpicture/mvtk-service');
const Models_1 = require('../../../common/models/Models');
const Util_1 = require('../../../common/Util/Util');
class AuthController extends BaseController_1.default {
    /**
     * ログイン
     */
    login() {
        if (this.req.method === 'POST') {
            let memberInfoService = mvtkService.createMemberInfoService();
            memberInfoService.getMemberAuthorization(this.req.body.email, this.req.body.password, (err, response, kiinCd) => {
                if (err) {
                    return this.res.json({
                        isSuccess: false,
                        accessToken: null
                    });
                }
                if (kiinCd) {
                    let token = Util_1.default.createToken();
                    Models_1.default.Authentication.findOneAndUpdate({
                        mvtk_kiin_cd: kiinCd
                    }, {
                        token: token,
                    }, {
                        upsert: true
                    }, (err, authenticationDocument) => {
                        if (err) {
                        }
                        else {
                            this.res.json({
                                isSuccess: true,
                                accessToken: token
                            });
                        }
                    });
                }
                else {
                    this.res.json({
                        isSuccess: false,
                        acceeToken: null
                    });
                }
            });
        }
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AuthController;
