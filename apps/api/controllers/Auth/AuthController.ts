import BaseController from '../BaseController';
import Models from '../../../common/models/Models';
import Util from '../../../common/Util/Util';

export default class AuthController extends BaseController {
    /**
     * ログイン
     */
    public login(): void {
        let util: typeof Util = require('../../../common/Util/Util');
        let token = util.createToken();
        Models.Authentication.findOneAndUpdate(
            {
                mvtk_kiin_cd: '00000775' // テスト用会員コード
            },
            {
                token: token,
            },
            {
                upsert: true,
                new: true
            },
            (err, authentication) => {
                if (err) {
                    this.res.json({
                        success: false,
                        access_token: null,
                        mvtk_kiin_cd: null
                    });
                } else {
                    this.res.json({
                        success: true,
                        access_token: authentication.get('token'),
                        mvtk_kiin_cd: authentication.get('mvtk_kiin_cd') // テスト用会員コード
                    });
                }
            }
        );
    }
}
