"use strict";
const BaseController_1 = require('../BaseController');
const Models_1 = require('../../../common/models/Models');
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
                this.res.render('screen/show', {
                    layout: false,
                    screenDocument: screenDocument,
                });
            }
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ScreenController;
