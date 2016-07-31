import BaseController from '../BaseController';
import Models from '../../../common/models/Models';

import fs = require('fs-extra');

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

                    // スクリーン座席表HTMLを保管
                    // TODO ひとまず固定だが、最終的にはパフォーマンスに応じて適切なスクリーンを入れる
                    fs.readFile(`${__dirname}/../../../common/views/screens/map.ejs`, 'utf8', (err, data) => {
                        this.res.send(data);
                    });
                }
            }
        );

    }
}
