import BaseController from '../../BaseController';
import StaffUser from '../../../models/User/StaffUser';
import StaffLoginForm from '../../../forms/Staff/StaffLoginForm';
import Util from '../../../../common/Util/Util';
import Models from '../../../../common/models/Models';
import mongoose = require('mongoose');

export default class StaffAuthController extends BaseController {
    public login(): void {
        if (this.staffUser.isAuthenticated()) {
            return this.res.redirect(this.router.build('staff.reserve.performances', {}));
        }

        let staffLoginForm = new StaffLoginForm();
        if (this.req.method === 'POST') {

            staffLoginForm.form.handle(this.req, {
                success: (form) => {
                    staffLoginForm.form = form;

                    // ユーザー認証
                    this.logger.debug('finding staff... user_id:', form.data.user_id);
                    Models.Staff.findOne(
                    {
                        user_id: form.data.user_id,
                        password: form.data.password,
                    },
                    (err, staffDocument) => {

                        if (err || staffDocument === null) {
                            this.res.render('staff/auth/login', {
                                form: form,
                            });
                        } else {
                            // ログイン
                            this.req.session[StaffUser.AUTH_SESSION_NAME] = staffDocument.toObject();
                            this.req.session[StaffUser.AUTH_SESSION_NAME]['signature'] = form.data.signature;

                            this.res.redirect(this.router.build('staff.mypage', {}));
                        }
                    });
                },
                error: (form) => {
                    this.res.render('staff/auth/login', {
                        form: form,
                    });
                },
                empty: (form) => {
                    this.res.render('staff/auth/login', {
                        form: form,
                    });
                }
            });


        } else {
            this.res.render('staff/auth/login', {
                form: staffLoginForm.form,
            });
        }
    }

    public logout(): void {
        delete this.req.session[StaffUser.AUTH_SESSION_NAME];

        this.res.redirect('/');
    }
}
