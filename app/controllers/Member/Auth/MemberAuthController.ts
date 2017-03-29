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
     */
    public login(): void {
        // 期限指定
        const now = moment();
        const dateStartMemberReservation = moment(conf.get<string>('datetimes.reservation_start_members'));
        const dateEndMemberReservation = moment(conf.get<string>('datetimes.reservation_end_members'));
        if (now < dateStartMemberReservation || dateEndMemberReservation < now) {
            this.next(new Error(this.req.__('Message.OutOfTerm')));
            return;
        }

        if (this.req.memberUser !== undefined && this.req.memberUser.isAuthenticated()) {
            this.res.redirect(this.router.build('member.reserve.start'));
            return;
        }

        if (this.req.method === 'POST') {
            memberLoginForm(this.req, this.res, async () => {
                const form = this.req.form;
                if (form !== undefined && form.isValid) {
                    try {
                        // ユーザー認証
                        this.logger.debug('finding member... user_id:', (<any>form).userId);
                        const member = await Models.Member.findOne(
                            {
                                user_id: (<any>form).userId
                            }
                        ).exec();

                        if (member === null) {
                            form.errors.push('ログイン番号またはパスワードに誤りがあります');
                            this.res.render('member/auth/login');
                            return;
                        }
                        // パスワードチェック
                        if (member.get('password_hash') !== Util.createHash((<any>form).password, member.get('password_salt'))) {
                            form.errors.push('ログイン番号またはパスワードに誤りがあります');
                            this.res.render('member/auth/login');
                            return;
                        }

                        // ログイン
                        (<Express.Session>this.req.session)[MemberUser.AUTH_SESSION_NAME] = member.toObject();
                        this.res.redirect(this.router.build('member.reserve.start'));
                    } catch (error) {
                        this.next(new Error(this.req.__('Message.UnexpectedError')));
                    }
                } else {
                    this.res.render('member/auth/login');
                }
            });
        } else {
            this.res.locals.userId = '';
            this.res.locals.password = '';

            this.res.render('member/auth/login');
        }
    }
}
