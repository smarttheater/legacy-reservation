"use strict";
const BaseController_1 = require('../../BaseController');
const SponsorUser_1 = require('../../../models/User/SponsorUser');
const sponsorLoginForm_1 = require('../../../forms/Sponsor/sponsorLoginForm');
const Models_1 = require('../../../../common/models/Models');
class SponsorAuthController extends BaseController_1.default {
    /**
     * sponsor login
     * TODO パフォーマンス指定or無指定どちらか判断
     */
    login() {
        if (this.sponsorUser.isAuthenticated()) {
            return this.res.redirect(this.router.build('sponsor.reserve.performances', {}));
        }
        if (this.req.method === 'POST') {
            let form = sponsorLoginForm_1.default(this.req);
            form(this.req, this.res, (err) => {
                if (this.req.form.isValid) {
                    // ユーザー認証
                    this.logger.debug('finding sponsor... user_id:', this.req.form['userId']);
                    Models_1.default.Sponsor.findOne({
                        user_id: this.req.form['userId'],
                        password: this.req.form['password'],
                    }, (err, sponsorDocument) => {
                        if (err || sponsorDocument === null) {
                            this.req.form.errors.push(this.req.__('Message.invalid{{fieldName}}', { fieldName: this.req.__('Form.FieldName.password') }));
                            this.res.render('sponsor/auth/login', {
                                layout: 'layouts/sponsor/layout'
                            });
                        }
                        else {
                            // ログイン
                            this.req.session[SponsorUser_1.default.AUTH_SESSION_NAME] = sponsorDocument.toObject();
                            // TODO リダイレクト先を指定できるようにする
                            this.res.redirect(this.router.build('sponsor.mypage', {}));
                        }
                    });
                }
                else {
                    this.res.render('sponsor/auth/login', {
                        layout: 'layouts/sponsor/layout'
                    });
                }
            });
        }
        else {
            this.res.locals.userId = '';
            this.res.locals.password = '';
            this.res.render('sponsor/auth/login', {
                layout: 'layouts/sponsor/layout'
            });
        }
    }
    logout() {
        delete this.req.session[SponsorUser_1.default.AUTH_SESSION_NAME];
        this.res.redirect('/');
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SponsorAuthController;
