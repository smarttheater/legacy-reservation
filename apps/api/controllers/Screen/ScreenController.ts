import BaseController from '../BaseController';
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
                    this.res.type('txt');
                    this.res.render('screen/show', {
                        layout: false,
                        screenDocument: screenDocument,
                    });
                }
            }
        );

    }
}
