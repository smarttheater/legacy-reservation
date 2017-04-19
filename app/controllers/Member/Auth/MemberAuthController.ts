import { Models } from '@motionpicture/chevre-domain';
import * as conf from 'config';
import * as moment from 'moment';
import * as Util from '../../../../common/Util/Util';
import memberLoginForm from '../../../forms/member/memberLoginForm';
import MemberUser from '../../../models/User/MemberUser';
import BaseController from '../../BaseController';

/**
 * メルマガ先行会員認証コントローラー
 *
 * @export
 * @class MemberAuthController
 * @extends {BaseController}
 */
export default class MemberAuthController extends BaseController {
    public layout: string = 'layouts/member/layout';

    /**
     * メルマガ会員ログイン
     * @returns {Promise<void>}
     */
    public async login(): Promise<void> {
        // 期限指定
        const now = moment();
        const dateStartMemberReservation = moment(conf.get<string>('datetimes.reservation_start_members'));
        const dateEndMemberReservation = moment(conf.get<string>('datetimes.reservation_end_members'));
        if (now < dateStartMemberReservation || dateEndMemberReservation < now) {
            this.next(new Error(this.req.__('Message.OutOfTerm')));
            return;
        }

        if (this.req.memberUser !== undefined && this.req.memberUser.isAuthenticated()) {
            this.res.redirect('/member/reserve/start');
            return;
        }

        if (this.req.method === 'POST') {
            memberLoginForm(this.req);
            const validationResult = await this.req.getValidationResult();
            if (!validationResult.isEmpty()) {
                this.res.locals.userId = this.req.body.userId;
                this.res.locals.password = '';
                this.res.locals.validation = validationResult.array();
                this.res.render('member/auth/login');
                return;
            }
            try {
                // ユーザー認証
                this.logger.debug('finding member... user_id:', this.req.body.userId);
                const member = await Models.Member.findOne(
                    {
                        user_id: this.req.body.userId
                    }
                ).exec();
                this.res.locals.userId = this.req.body.userId;
                this.res.locals.password = '';
                if (member === null) {
                    this.res.locals.validation = [{ msg: 'ログイン番号またはパスワードに誤りがあります' }];
                    this.res.render('member/auth/login');
                    return;
                }
                // パスワードチェック
                if (member.get('password_hash') !== Util.createHash(this.req.body.password, member.get('password_salt'))) {
                    this.res.locals.validation = [{ msg: 'ログイン番号またはパスワードに誤りがあります' }];
                    this.res.render('member/auth/login');
                    return;
                }

                // ログイン
                (<Express.Session>this.req.session)[MemberUser.AUTH_SESSION_NAME] = member.toObject();
                this.res.redirect('/member/reserve/start');
                return;
            } catch (error) {
                this.next(new Error(this.req.__('Message.UnexpectedError')));
                return;
            }

        } else {
            this.res.locals.userId = '';
            this.res.locals.password = '';

            this.res.render('member/auth/login');
        }
    }
}
