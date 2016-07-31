"use strict";
const BaseController_1 = require('../../BaseController');
class SponsorMyPageController extends BaseController_1.default {
    index() {
        this.res.render('sponsor/mypage/index', {
            layout: 'layouts/sponsor/layout'
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SponsorMyPageController;
