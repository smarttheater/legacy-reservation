import BaseController from '../BaseController';
import mvtkService = require('@motionpicture/mvtk-service');
import Models from '../../../common/models/Models';
import Util from '../../../common/Util/Util';

export default class AuthController extends BaseController {
    /**
     * ログイン
     */
    public login(): void {
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
                    let token = Util.createToken();
                    Models.Authentication.findOneAndUpdate(
                        {
                            mvtk_kiin_cd: kiinCd
                        },
                        {
                            token: token,
                        },
                        {
                            upsert: true
                        },
                        (err, authenticationDocument) => {
                            if (err) {

                            } else {
                                this.res.json({
                                    isSuccess: true,
                                    accessToken: token
                                });

                            }

                        }
                    );

                } else {
                    this.res.json({
                        isSuccess: false,
                        acceeToken: null
                    });

                }
            });

        }

    }
}
