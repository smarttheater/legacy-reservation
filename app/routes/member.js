"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const MemberAuthController_1 = require("../controllers/Member/Auth/MemberAuthController");
const MemberReserveController_1 = require("../controllers/Member/Reserve/MemberReserveController");
const MemberUser_1 = require("../models/User/MemberUser");
exports.default = (app) => {
    const authentication = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
        if (req.memberUser === undefined) {
            next(new Error(req.__('Message.UnexpectedError')));
            return;
        }
        // 既ログインの場合
        if (req.memberUser.isAuthenticated()) {
            next();
            return;
        }
        if (req.xhr) {
            res.json({
                success: false,
                message: 'login required'
            });
        }
        else {
            res.redirect('/member/login');
        }
    });
    // tslint:disable-next-line:variable-name
    const base = (req, _res, next) => __awaiter(this, void 0, void 0, function* () {
        req.memberUser = MemberUser_1.default.parse(req.session);
        next();
    });
    // メルマガ先行
    // tslint:disable:max-line-length
    app.all('/member/login', 'member.reserve.terms', base, (req, res, next) => { (new MemberAuthController_1.default(req, res, next)).login(); });
    app.get('/member/reserve/start', 'member.reserve.start', base, (req, res, next) => __awaiter(this, void 0, void 0, function* () { yield (new MemberReserveController_1.default(req, res, next)).start(); }));
    app.all('/member/reserve/:token/tickets', 'member.reserve.tickets', base, authentication, (req, res, next) => __awaiter(this, void 0, void 0, function* () { yield (new MemberReserveController_1.default(req, res, next)).tickets(); }));
    app.all('/member/reserve/:token/profile', 'member.reserve.profile', base, authentication, (req, res, next) => __awaiter(this, void 0, void 0, function* () { yield (new MemberReserveController_1.default(req, res, next)).profile(); }));
    app.all('/member/reserve/:token/confirm', 'member.reserve.confirm', base, authentication, (req, res, next) => __awaiter(this, void 0, void 0, function* () { yield (new MemberReserveController_1.default(req, res, next)).confirm(); }));
    app.get('/member/reserve/:paymentNo/complete', 'member.reserve.complete', base, (req, res, next) => __awaiter(this, void 0, void 0, function* () { yield (new MemberReserveController_1.default(req, res, next)).complete(); }));
};
