"use strict";
const BaseController_1 = require('../BaseController');
const Models_1 = require('../../../common/models/Models');
const fs = require('fs-extra');
class ScreenController extends BaseController_1.default {
    /**
     * スクリーンの座席マップを生成する
     */
    show() {
        let id = this.req.params.id;
        // スクリーンを取得
        Models_1.default.Screen.findOne({
            _id: id
        }, {}, {}, (err, screenDocument) => {
            if (err) {
                this.res.send('false');
            }
            else {
                this.res.type('txt');
                // スクリーン座席表HTMLを保管
                // TODO ひとまず固定だが、最終的にはパフォーマンスに応じて適切なスクリーンを入れる
                fs.readFile(`${__dirname}/../../../common/views/screens/map.ejs`, 'utf8', (err, data) => {
                    this.res.send(data);
                });
            }
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ScreenController;
