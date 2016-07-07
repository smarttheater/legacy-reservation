import BaseController from '../BaseController';
import Util from '../../../common/Util/Util';
import Models from '../../../common/models/Models';

export default class ScreenController extends BaseController {
    /**
     * スクリーンの座席マップを生成する
     */
    public show() {
        let id = this.req.params.id;

        // スクリーンを取得
        Models.Screen.findOne(
            {
                _id: id
            },
            {},
            {},
            (err, screenDocument) => {

                if (err) {
                    this.res.send('false');

                } else {
                    this.res.render('screen/show', {
                        layout: false,
                        screenDocument: screenDocument,
                    });
                }
            }
        );

    }
}
