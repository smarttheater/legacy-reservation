import BaseController from '../BaseController';
import Models from '../../../common/models/Models';
import fs = require('fs-extra');

export default class ScreenController extends BaseController {
    /**
     * スクリーンの座席マップを生成する
     */
    public show() {
        // スクリーンを取得
        Models.Screen.count(
            {
                _id: this.req.params.id
            },
            (err, count) => {
                if (err) return this.res.send('false');
                if (count === 0) return this.res.send('false');

                // スクリーン座席表HTMLを出力
                this.res.type('txt');
                fs.readFile(`${__dirname}/../../../common/views/screens/${this.req.params.id}.ejs`, 'utf8', (err, data) => {
                    this.res.send(data);
                });
            }
        );
    }
}
