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
                    mvtk_kiin_cd: '00000775' // テスト用会員コード
                },
                {
                    token: token,
                },
                {
                    upsert: true
                },
                (err, authentication) => {
                    if (err) {
                        this.res.json({
                            isSuccess: false,
                            accessToken: null,
                            mvtk_kiin_cd: null
                        });
                    } else {
                        this.res.json({
                            isSuccess: true,
                            accessToken: authentication.get('token'),
                            mvtk_kiin_cd: authentication.get('mvtk_kiin_cd') // テスト用会員コード
                        });
                    }
                }
            );
        }
    }
}
