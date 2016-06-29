import NamedRoutes = require('named-routes');
import express = require('express');

import CustomerReserveController from '../controllers/Customer/Reserve/CustomerReserveController';
import MemberReserveController from '../controllers/Member/Reserve/MemberReserveController';
import StaffAuthController from '../controllers/Staff/Auth/StaffAuthController';
import StaffCancelController from '../controllers/Staff/Cancel/StaffCancelController';
import StaffMyPageController from '../controllers/Staff/MyPage/StaffMyPageController';
import StaffReserveController from '../controllers/Staff/Reserve/StaffReserveController';
import SponsorReserveController from '../controllers/Sponsor/Reserve/SponsorReserveController';
import SponsorCancelController from '../controllers/Sponsor/Cancel/SponsorCancelController';
import ErrorController from '../controllers/Error/ErrorController';
import IndexController from '../controllers/Index/IndexController';
import TaskController from '../controllers/Task/TaskController';

import MemberUser from '../models/User/MemberUser';
import StaffUser from '../models/User/StaffUser';
import SponsorUser from '../models/User/SponsorUser';

/**
 * URLルーティングを行うクラス
 * 
 * app.get(パス, ルーティング名称, メソッド);
 * といった形でルーティングを登録する
 * ルーティング名称は、ejs側やコントローラーでURLを生成する際に用いたりするので、意識的にページ一意な値を定めること
 * 
 * リクエスト毎に、req,res,nextでコントローラーインスタンスを生成して、URLに応じたメソッドを実行する、という考え方
 * 
 * メタタグ情報は./metas.jsonで管理しています
 */
export default class Router {
    private static instance: Router;
    private router: NamedRoutes.INamedRoutes;

    public static getInstance() {
        if (!Router.instance) {
            Router.instance = new Router();
        }

        return Router.instance;
    }

    public getRouter(): NamedRoutes.INamedRoutes {
        return this.router;
    }

    public initialize(app: any) {
        this.router = new NamedRoutes({});
        this.router.extendExpress(app);
        this.router.registerAppHelpers(app);

        app.get('/', 'Home', (req, res, next) => {(new IndexController(req, res, next)).index()});

        // 一般
        app.all('/customer/reserve/terms', 'customer.reserve.terms', (req, res, next) => {(new CustomerReserveController(req, res, next)).terms()});
        app.all('/customer/reserve/:token/performances', 'customer.reserve.performances', (req, res, next) => {(new CustomerReserveController(req, res, next)).performances()});
        app.all('/customer/reserve/:token/seats', 'customer.reserve.seats', (req, res, next) => {(new CustomerReserveController(req, res, next)).seats()});
        app.all('/customer/reserve/:token/tickets', 'customer.reserve.tickets', (req, res, next) => {(new CustomerReserveController(req, res, next)).tickets()});
        app.all('/customer/reserve/:token/profile', 'customer.reserve.profile', (req, res, next) => {(new CustomerReserveController(req, res, next)).profile()});
        app.all('/customer/reserve/:token/pay', 'customer.reserve.pay', (req, res, next) => {(new CustomerReserveController(req, res, next)).pay()});
        app.all('/customer/reserve/:token/confirm', 'customer.reserve.confirm', (req, res, next) => {(new CustomerReserveController(req, res, next)).confirm()});
        app.get('/customer/reserve/:token/process', 'customer.reserve.process', (req, res, next) => {(new CustomerReserveController(req, res, next)).process()});
        app.post('/customer/reserve/fromGMO', 'customer.reserve.fromGMO', (req, res, next) => {(new CustomerReserveController(req, res, next)).fromGMO()});
        app.get('/customer/reserve/:token/complete', 'customer.reserve.complete', (req, res, next) => {(new CustomerReserveController(req, res, next)).complete()});



        // キャンセル
        app.all('/sponsor/cancel', 'sponsor.cancel', (req, res, next) => {(new SponsorCancelController(req, res, next)).index()});
        app.get('/sponsor/cancel/:token/reservations', 'sponsor.cancel.reservations', (req, res, next) => {(new SponsorCancelController(req, res, next)).reservations()});
        app.post('/sponsor/cancel/execute', 'sponsor.cancel.execute', (req, res, next) => {(new SponsorCancelController(req, res, next)).execute()});




        // タスク
        app.get('/task/removeTemporaryReservation', 'task.removeTemporaryReservation', (req, res, next) => {(new TaskController(req, res, next)).removeTemporaryReservation()});

        let authenticationMember = (req: express.Request, res: express.Response, next: express.NextFunction) => {
            let memberUser = MemberUser.getInstance();
            if (!memberUser.isAuthenticated()) {
                if (req.xhr) {
                    res.json({
                        message: 'login required.'
                    });
                } else {
                    res.redirect('/member/reserve/terms');
                }
            } else {
                next();
            }
        }

        let authenticationStaff = (req: express.Request, res: express.Response, next: express.NextFunction) => {
            let staffUser = StaffUser.getInstance();
            if (!staffUser.isAuthenticated()) {
                if (req.xhr) {
                    res.json({
                        message: 'login required.'
                    });
                } else {
                    res.redirect('/staff/login');
                }
            } else {
                next();
            }
        }

        let authenticationSponsor = (req: express.Request, res: express.Response, next: express.NextFunction) => {
            let sponsorUser = SponsorUser.getInstance();
            if (!sponsorUser.isAuthenticated()) {
                if (req.xhr) {
                    res.json({
                        message: 'login required.'
                    });
                } else {
                    res.redirect('/sponsor/reserve/terms');
                }
            } else {
                next();
            }
        }

        // メルマガ先行
        app.all('/member/reserve/terms', 'member.reserve.terms', (req, res, next) => {(new MemberReserveController(req, res, next)).terms()});
        app.get('/member/reserve/start', 'member.reserve.start', (req, res, next) => {(new MemberReserveController(req, res, next)).start()});
        app.all('/member/reserve/:token/tickets', 'member.reserve.tickets', authenticationMember, (req, res, next) => {(new MemberReserveController(req, res, next)).tickets()});
        app.all('/member/reserve/:token/profile', 'member.reserve.profile', authenticationMember, (req, res, next) => {(new MemberReserveController(req, res, next)).profile()});
        app.all('/member/reserve/:token/pay', 'member.reserve.pay', authenticationMember, (req, res, next) => {(new MemberReserveController(req, res, next)).pay()});
        app.all('/member/reserve/:token/confirm', 'member.reserve.confirm', authenticationMember, (req, res, next) => {(new MemberReserveController(req, res, next)).confirm()});
        app.get('/member/reserve/:token/process', 'member.reserve.process', authenticationMember, (req, res, next) => {(new MemberReserveController(req, res, next)).process()});
        app.get('/member/reserve/:token/complete', 'member.reserve.complete', authenticationMember, (req, res, next) => {(new MemberReserveController(req, res, next)).complete()});


        // 内部関係者
        app.all('/staff/login', 'staff.login', (req, res, next) => {(new StaffAuthController(req, res, next)).login()});
        app.all('/staff/logout', 'staff.logout', (req, res, next) => {(new StaffAuthController(req, res, next)).logout()});

        app.all('/staff/mypage', 'staff.mypage', authenticationStaff, (req, res, next) => {(new StaffMyPageController(req, res, next)).index()});
        app.post('/staff/mypage/updateWatcherName', 'staff.mypage.updateWatcherName', authenticationStaff, (req, res, next) => {(new StaffMyPageController(req, res, next)).updateWatcherName()});

        app.all('/staff/reserve/performances', 'staff.reserve.performances', authenticationStaff, (req, res, next) => {(new StaffReserveController(req, res, next)).performances()});
        app.all('/staff/reserve/:token/seats', 'staff.reserve.seats', authenticationStaff, (req, res, next) => {(new StaffReserveController(req, res, next)).seats()});
        app.all('/staff/reserve/:token/tickets', 'staff.reserve.tickets', authenticationStaff, (req, res, next) => {(new StaffReserveController(req, res, next)).tickets()});
        app.all('/staff/reserve/:token/confirm', 'staff.reserve.confirm', authenticationStaff, (req, res, next) => {(new StaffReserveController(req, res, next)).confirm()});
        app.get('/staff/reserve/:token/process', 'staff.reserve.process', authenticationStaff, (req, res, next) => {(new StaffReserveController(req, res, next)).process()});
        app.get('/staff/reserve/:token/complete', 'staff.reserve.complete', authenticationStaff, (req, res, next) => {(new StaffReserveController(req, res, next)).complete()});
        app.post('/staff/cancel/execute', 'staff.cancel.execute', authenticationStaff, (req, res, next) => {(new StaffCancelController(req, res, next)).execute()});

        // 外部関係者
        app.all('/sponsor/reserve/terms', 'sponsor.reserve.terms', (req, res, next) => {(new SponsorReserveController(req, res, next)).terms()});
        app.all('/sponsor/reserve/performances', 'sponsor.reserve.performances', authenticationSponsor, (req, res, next) => {(new SponsorReserveController(req, res, next)).performances()});
        app.all('/sponsor/reserve/:token/seats', 'sponsor.reserve.seats', authenticationSponsor, (req, res, next) => {(new SponsorReserveController(req, res, next)).seats()});
        app.all('/sponsor/reserve/:token/tickets', 'sponsor.reserve.tickets', authenticationSponsor, (req, res, next) => {(new SponsorReserveController(req, res, next)).tickets()});
        app.all('/sponsor/reserve/:token/profile', 'sponsor.reserve.profile', authenticationSponsor, (req, res, next) => {(new SponsorReserveController(req, res, next)).profile()});
        app.all('/sponsor/reserve/:token/confirm', 'sponsor.reserve.confirm', authenticationSponsor, (req, res, next) => {(new SponsorReserveController(req, res, next)).confirm()});
        app.get('/sponsor/reserve/:token/process', 'sponsor.reserve.process', authenticationSponsor, (req, res, next) => {(new SponsorReserveController(req, res, next)).process()});
        app.get('/sponsor/reserve/:token/complete', 'sponsor.reserve.complete', authenticationSponsor, (req, res, next) => {(new SponsorReserveController(req, res, next)).complete()});



        app.get('/Error/NotFound', 'Error.NotFound', (req, res, next) => {(new ErrorController(req, res, next)).notFound()});

        // 404
        app.use((req, res, next) => {
            return res.redirect('/Error/NotFound');
        });

        // error handlers
        app.use((err: any, req, res, next) => {
            (new ErrorController(req, res, next)).index(err);
        });
    }
}
