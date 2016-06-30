import BaseController from '../../BaseController';
import SponsorUser from '../../../models/User/SponsorUser';
import Util from '../../../../common/Util/Util';
import ReservationUtil from '../../../../common/models/Reservation/ReservationUtil';
import Models from '../../../../common/models/Models';

export default class SponsorMyPageController extends BaseController {
    public index(): void {
        this.res.render('sponsor/mypage/index', {
            layout: 'layouts/sponsor/layout',
        });
    }
}
