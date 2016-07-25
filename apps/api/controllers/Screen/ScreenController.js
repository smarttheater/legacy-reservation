"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var BaseController_1 = require('../BaseController');
var Models_1 = require('../../../common/models/Models');
var ScreenController = (function (_super) {
    __extends(ScreenController, _super);
    function ScreenController() {
        _super.apply(this, arguments);
    }
    /**
     * スクリーンの座席マップを生成する
     */
    ScreenController.prototype.show = function () {
        var _this = this;
        var id = this.req.params.id;
        // スクリーンを取得
        Models_1.default.Screen.findOne({
            _id: id
        }, {}, {}, function (err, screenDocument) {
            if (err) {
                _this.res.send('false');
            }
            else {
                _this.res.type('txt');
                _this.res.render('screen/show', {
                    layout: false,
                    screenDocument: screenDocument,
                });
            }
        });
    };
    return ScreenController;
}(BaseController_1.default));
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ScreenController;
