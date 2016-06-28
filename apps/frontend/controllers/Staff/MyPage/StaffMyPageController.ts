import BaseController from '../../BaseController';
import StaffUser from '../../../models/User/StaffUser';
import Util from '../../../../common/Util/Util';
import Models from '../../../../common/models/Models';
import mongoose = require('mongoose');

export default class StaffMyPageController extends BaseController {
    public index(): void {
        this.res.render('staff/mypage/index', {
            layout: 'layouts/staff/layout'
        });
    }
}
