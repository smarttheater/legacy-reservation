import NamedRoutes = require('named-routes');
import express = require('express');

import AdmissionController from '../controllers/Admission/AdmissionController';
import MemberReserveController from '../controllers/Member/Reserve/MemberReserveController';
import GMOReserveController from  '../controllers/GMO/Reserve/GMOReserveController';
import ReserveController from '../controllers/Reserve/ReserveController';
import LanguageController from '../controllers/Language/LanguageController';

import CustomerAuthController from '../controllers/Customer/Auth/CustomerAuthController';
import CustomerReserveController from '../controllers/Customer/Reserve/CustomerReserveController';

import StaffAuthController from '../controllers/Staff/Auth/StaffAuthController';
import StaffCancelController from '../controllers/Staff/Cancel/StaffCancelController';
import StaffMyPageController from '../controllers/Staff/MyPage/StaffMyPageController';
import StaffReserveController from '../controllers/Staff/Reserve/StaffReserveController';

import SponsorAuthController from '../controllers/Sponsor/Auth/SponsorAuthController';
import SponsorMyPageController from '../controllers/Sponsor/MyPage/SponsorMyPageController';
import SponsorReserveController from '../controllers/Sponsor/Reserve/SponsorReserveController';
import SponsorCancelController from '../controllers/Sponsor/Cancel/SponsorCancelController';

import WindowAuthController from '../controllers/Window/Auth/WindowAuthController';
import WindowMyPageController from '../controllers/Window/MyPage/WindowMyPageController';
import WindowReserveController from '../controllers/Window/Reserve/WindowReserveController';
import WindowCancelController from '../controllers/Window/Cancel/WindowCancelController';

import ErrorController from '../controllers/Error/ErrorController';
import IndexController from '../controllers/Index/IndexController';

import MvtkUser from '../models/User/MvtkUser';
import MemberUser from '../models/User/MemberUser';
import StaffUser from '../models/User/StaffUser';
import SponsorUser from '../models/User/SponsorUser';
import WindowUser from '../models/User/WindowUser';

/**
 * URLルーティング
 * 
 * app.get(パス, ルーティング名称, メソッド);
 * といった形でルーティングを登録する
 * ルーティング名称は、ejs側やコントローラーでURLを生成する際に用いたりするので、意識的にページ一意な値を定めること
 * 
 * リクエスト毎に、req,res,nextでコントローラーインスタンスを生成して、URLに応じたメソッドを実行する、という考え方
 * 
 * メタタグ情報は./metas.jsonで管理しています
 */
export default (app: any) => {
    let router = new NamedRoutes();
    router.extendExpress(app);
    router.registerAppHelpers(app);

    app.get('/', 'Home', (req, res, next) => {(new IndexController(req, res, next)).index()});

    // 言語
    app.get('/language/update/:locale', 'language.update', (req, res, next) => {(new LanguageController(req, res, next)).update()});

    app.get('/reserve/:token/getSeatProperties', 'reserve.getSeatProperties', (req, res, next) => {(new ReserveController(req, res, next)).getSeatProperties()});
    app.get('/reserve/:reservationId/barcode', 'reserve.barcode', (req, res, next) => {(new ReserveController(req, res, next)).barcode()});
    app.get('/reserve/:reservationId/qrcode', 'reserve.qrcode', (req, res, next) => {(new ReserveController(req, res, next)).qrcode()});


    // GMOプロセス
    app.get('/GMO/reserve/:token/start', 'gmo.reserve.start', (req, res, next) => {(new GMOReserveController(req, res, next)).start()});
    app.post('/GMO/reserve/result', 'gmo.reserve.result', (req, res, next) => {(new GMOReserveController(req, res, next)).result()});
    app.all('/GMO/reserve/notify', 'gmo.reserve.notify', (req, res, next) => {(new GMOReserveController(req, res, next)).notify()});
    app.all('/GMO/reserve/:paymentNo/cancel', 'gmo.reserve.cancel', (req, res, next) => {(new GMOReserveController(req, res, next)).cancel()});





    // admission
    app.get('/admission/performances', 'admission.performances', (req, res, next) => {(new AdmissionController(req, res, next)).performances()});
    app.get('/admission/performance/:id/confirm', 'admission.confirm', (req, res, next) => {(new AdmissionController(req, res, next)).confirm()});
    



    let authenticationCustomer = (req: express.Request, res: express.Response, next: express.NextFunction) => {
        let mvtkUser = MvtkUser.getInstance();
        if (!mvtkUser.isAuthenticated()) {
            if (req.xhr) {
                res.json({
                    message: 'login required.'
                });
            } else {
                res.redirect(`/customer/login?cb=${req.originalUrl}`);
            }
        } else {
            next();
        }
    }

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
                res.redirect(`/staff/login?cb=${req.originalUrl}`);
            }
        } else {
            // 言語設定
            req.setLocale((staffUser.get('locale')) ? staffUser.get('locale') : 'en');

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
                res.redirect(`/sponsor/login?cb=${req.originalUrl}`);
            }
        } else {
            // 言語設定
            req.setLocale((sponsorUser.get('locale')) ? sponsorUser.get('locale') : 'en');

            next();
        }
    }

    let authenticationWindow = (req: express.Request, res: express.Response, next: express.NextFunction) => {
        let windowUser = WindowUser.getInstance();
        if (!windowUser.isAuthenticated()) {
            if (req.xhr) {
                res.json({
                    message: 'login required.'
                });
            } else {
                res.redirect(`/window/login?cb=${req.originalUrl}`);
            }
        } else {
            // 言語設定
            req.setLocale((windowUser.get('locale')) ? windowUser.get('locale') : 'ja');

            next();
        }
    }






    // 一般
    app.all('/customer/reserve/performances', 'customer.reserve.performances', (req, res, next) => {(new CustomerReserveController(req, res, next)).performances()});
    app.post('/customer/reserve/start', 'customer.reserve.start', (req, res, next) => {(new CustomerReserveController(req, res, next)).start()});
    app.all('/customer/login', 'customer.reserve.terms', (req, res, next) => {(new CustomerAuthController(req, res, next)).login()});
    app.all('/customer/logout', 'customer.logout', authenticationCustomer, (req, res, next) => {(new CustomerAuthController(req, res, next)).logout()});

    app.get('/customer/reserve/:token/login', 'customer.reserve.login', authenticationCustomer, (req, res, next) => {(new CustomerReserveController(req, res, next)).login()});
    app.all('/customer/reserve/:token/seats', 'customer.reserve.seats', authenticationCustomer, (req, res, next) => {(new CustomerReserveController(req, res, next)).seats()});
    app.all('/customer/reserve/:token/tickets', 'customer.reserve.tickets', authenticationCustomer, (req, res, next) => {(new CustomerReserveController(req, res, next)).tickets()});
    app.all('/customer/reserve/:token/profile', 'customer.reserve.profile', authenticationCustomer, (req, res, next) => {(new CustomerReserveController(req, res, next)).profile()});
    app.all('/customer/reserve/:token/confirm', 'customer.reserve.confirm', authenticationCustomer, (req, res, next) => {(new CustomerReserveController(req, res, next)).confirm()});
    app.get('/customer/reserve/:paymentNo/waitingSettlement', 'customer.reserve.waitingSettlement', authenticationCustomer, (req, res, next) => {(new CustomerReserveController(req, res, next)).waitingSettlement()});
    app.get('/customer/reserve/:paymentNo/complete', 'customer.reserve.complete', authenticationCustomer, (req, res, next) => {(new CustomerReserveController(req, res, next)).complete()});






    // メルマガ先行
    app.all('/member/reserve/terms', 'member.reserve.terms', (req, res, next) => {(new MemberReserveController(req, res, next)).terms()});
    app.get('/member/reserve/start', 'member.reserve.start', (req, res, next) => {(new MemberReserveController(req, res, next)).start()});
    app.all('/member/reserve/:token/tickets', 'member.reserve.tickets', authenticationMember, (req, res, next) => {(new MemberReserveController(req, res, next)).tickets()});
    app.all('/member/reserve/:token/profile', 'member.reserve.profile', authenticationMember, (req, res, next) => {(new MemberReserveController(req, res, next)).profile()});
    app.all('/member/reserve/:token/confirm', 'member.reserve.confirm', authenticationMember, (req, res, next) => {(new MemberReserveController(req, res, next)).confirm()});
    app.get('/member/reserve/:paymentNo/complete', 'member.reserve.complete', (req, res, next) => {(new MemberReserveController(req, res, next)).complete()});





    // TODO admin権限フロー





    // 内部関係者
    app.all('/staff/login', 'staff.mypage.login', (req, res, next) => {(new StaffAuthController(req, res, next)).login()});
    app.all('/staff/logout', 'staff.logout', (req, res, next) => {(new StaffAuthController(req, res, next)).logout()});
    app.all('/staff/mypage', 'staff.mypage', authenticationStaff, (req, res, next) => {(new StaffMyPageController(req, res, next)).index()});
    app.get('/staff/mypage/search', 'staff.mypage.search', authenticationStaff, (req, res, next) => {(new StaffMyPageController(req, res, next)).search()});
    app.post('/staff/mypage/updateWatcherName', 'staff.mypage.updateWatcherName', authenticationStaff, (req, res, next) => {(new StaffMyPageController(req, res, next)).updateWatcherName()});
    app.get('/staff/reserve/start', 'staff.reserve.start', authenticationStaff, (req, res, next) => {(new StaffReserveController(req, res, next)).start()});
    app.all('/staff/reserve/:token/performances', 'staff.reserve.performances', authenticationStaff, (req, res, next) => {(new StaffReserveController(req, res, next)).performances()});
    app.all('/staff/reserve/:token/seats', 'staff.reserve.seats', authenticationStaff, (req, res, next) => {(new StaffReserveController(req, res, next)).seats()});
    app.all('/staff/reserve/:token/tickets', 'staff.reserve.tickets', authenticationStaff, (req, res, next) => {(new StaffReserveController(req, res, next)).tickets()});
    app.all('/staff/reserve/:token/confirm', 'staff.reserve.confirm', authenticationStaff, (req, res, next) => {(new StaffReserveController(req, res, next)).confirm()});
    app.get('/staff/reserve/:paymentNo/complete', 'staff.reserve.complete', authenticationStaff, (req, res, next) => {(new StaffReserveController(req, res, next)).complete()});
    app.post('/staff/cancel/execute', 'staff.cancel.execute', authenticationStaff, (req, res, next) => {(new StaffCancelController(req, res, next)).execute()});


    let sponsorBase = (req: express.Request, res: express.Response, next: express.NextFunction) => {
        req.setLocale('en');
        next();
    }

    // 外部関係者
    app.all('/sponsor/login', 'sponsor.mypage.login', (req, res, next) => {(new SponsorAuthController(req, res, next)).login()});
    app.all('/sponsor/logout', 'sponsor.logout', authenticationSponsor, (req, res, next) => {(new SponsorAuthController(req, res, next)).logout()});
    app.all('/sponsor/mypage', 'sponsor.mypage', authenticationSponsor, (req, res, next) => {(new SponsorMyPageController(req, res, next)).index()});
    app.get('/sponsor/mypage/search', 'sponsor.mypage.search', authenticationSponsor, (req, res, next) => {(new SponsorMyPageController(req, res, next)).search()});
    app.get('/sponsor/reserve/start', 'sponsor.reserve.start', authenticationSponsor, (req, res, next) => {(new SponsorReserveController(req, res, next)).start()});
    app.all('/sponsor/reserve/:token/performances', 'sponsor.reserve.performances', sponsorBase, authenticationSponsor, (req, res, next) => {(new SponsorReserveController(req, res, next)).performances()});
    app.all('/sponsor/reserve/:token/seats', 'sponsor.reserve.seats', authenticationSponsor, (req, res, next) => {(new SponsorReserveController(req, res, next)).seats()});
    app.all('/sponsor/reserve/:token/tickets', 'sponsor.reserve.tickets', authenticationSponsor, (req, res, next) => {(new SponsorReserveController(req, res, next)).tickets()});
    app.all('/sponsor/reserve/:token/profile', 'sponsor.reserve.profile', authenticationSponsor, (req, res, next) => {(new SponsorReserveController(req, res, next)).profile()});
    app.all('/sponsor/reserve/:token/confirm', 'sponsor.reserve.confirm', authenticationSponsor, (req, res, next) => {(new SponsorReserveController(req, res, next)).confirm()});
    app.get('/sponsor/reserve/:paymentNo/complete', 'sponsor.reserve.complete', authenticationSponsor, (req, res, next) => {(new SponsorReserveController(req, res, next)).complete()});
    app.post('/sponsor/cancel/execute', 'sponsor.cancel.execute', authenticationSponsor, (req, res, next) => {(new SponsorCancelController(req, res, next)).execute()});
    // ↓ログイン不要
    app.all('/sponsor/cancel', 'sponsor.cancel', (req, res, next) => {(new SponsorCancelController(req, res, next)).index()});
    app.post('/sponsor/cancel/executeByPaymentNo', 'sponsor.cancel.executeByPaymentNo', (req, res, next) => {(new SponsorCancelController(req, res, next)).executeByPaymentNo()});





    // 当日窓口フロー
    // TODO 当日の場合、スケジュール選択候補は、検索条件通り全て出す
    // TODO 検索条件の初期値を、上映日：当日にする
    app.all('/window/login', 'window.mypage.login', (req, res, next) => {(new WindowAuthController(req, res, next)).login()});
    app.all('/window/logout', 'window.logout', (req, res, next) => {(new WindowAuthController(req, res, next)).logout()});
    app.all('/window/mypage', 'window.mypage', authenticationWindow, (req, res, next) => {(new WindowMyPageController(req, res, next)).index()});
    app.get('/window/mypage/search', 'window.mypage.search', authenticationWindow, (req, res, next) => {(new WindowMyPageController(req, res, next)).search()});
    app.get('/window/reserve/start', 'window.reserve.start', authenticationWindow, (req, res, next) => {(new WindowReserveController(req, res, next)).start()});
    app.all('/window/reserve/:token/performances', 'window.reserve.performances', authenticationWindow, (req, res, next) => {(new WindowReserveController(req, res, next)).performances()});
    app.all('/window/reserve/:token/seats', 'window.reserve.seats', authenticationWindow, (req, res, next) => {(new WindowReserveController(req, res, next)).seats()});
    app.all('/window/reserve/:token/tickets', 'window.reserve.tickets', authenticationWindow, (req, res, next) => {(new WindowReserveController(req, res, next)).tickets()});
    app.all('/window/reserve/:token/profile', 'window.reserve.profile', authenticationWindow, (req, res, next) => {(new WindowReserveController(req, res, next)).profile()});
    app.all('/window/reserve/:token/confirm', 'window.reserve.confirm', authenticationWindow, (req, res, next) => {(new WindowReserveController(req, res, next)).confirm()});
    app.get('/window/reserve/:paymentNo/complete', 'window.reserve.complete', authenticationWindow, (req, res, next) => {(new WindowReserveController(req, res, next)).complete()});
    app.post('/window/cancel/execute', 'window.cancel.execute', authenticationWindow, (req, res, next) => {(new WindowCancelController(req, res, next)).execute()});




    // TODO 電話窓口フロー




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
