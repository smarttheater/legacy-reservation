"use strict";
const BaseController_1 = require("../BaseController");
const Models_1 = require("../../../common/models/Models");
const fs = require("fs-extra");
class ScreenController extends BaseController_1.default {
    /**
     * スクリーンの座席マップを生成する
     */
    show() {
        // スクリーンを取得
        Models_1.default.Screen.count({
            _id: this.req.params.id
        }, (err, count) => {
            if (err)
                return this.res.send('false');
            if (count === 0)
                return this.res.send('false');
            // スクリーン座席表HTMLを出力
            this.res.type('txt');
            fs.readFile(`${__dirname}/../../../common/views/screens/${this.req.params.id}.ejs`, 'utf8', (err, data) => {
                this.res.send(data);
            });
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ScreenController;
