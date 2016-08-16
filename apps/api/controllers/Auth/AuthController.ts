import BaseController from '../BaseController';
import Models from '../../../common/models/Models';
import Util from '../../../common/Util/Util';

export default class AuthController extends BaseController {
    /**
     * ログイン
     */
    public login(): void {
        if (this.req.method === 'POST') {
            let token = Util.createToken();
            Models.Authentication.findOneAndUpdate(
                {
                    mvtk_kiin_cd: this.req.body.email
                },
                {
                    token: token,
                },
                {
                    upsert: true
                },
                (err, authenticationDocument) => {
                    if (err) {
                        this.res.json({
                            isSuccess: false,
                            accessToken: null
                        });
                    } else {
                        this.res.json({
                            isSuccess: true,
                            accessToken: token
                        });
                    }
                }
            );
        }
    }
}
