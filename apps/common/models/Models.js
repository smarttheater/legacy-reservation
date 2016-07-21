"use strict";
/**
 * MongoDBのモデルをまとめたモジュール
 */
var mongoose = require('mongoose');
var FilmSchema_1 = require('../models/Film/FilmSchema');
var MemberSchema_1 = require('../models/Member/MemberSchema');
var PerformanceSchema_1 = require('../models/Performance/PerformanceSchema');
var ReservationSchema_1 = require('../models/Reservation/ReservationSchema');
var ScreenSchema_1 = require('../models/Screen/ScreenSchema');
var SponsorSchema_1 = require('../models/Sponsor/SponsorSchema');
var StaffSchema_1 = require('../models/Staff/StaffSchema');
var TheaterSchema_1 = require('../models/Theater/TheaterSchema');
var Film = mongoose.model('Film', FilmSchema_1.default);
var Member = mongoose.model('Member', MemberSchema_1.default);
var Performance = mongoose.model('Performance', PerformanceSchema_1.default);
var Reservation = mongoose.model('Reservation', ReservationSchema_1.default);
var Screen = mongoose.model('Screen', ScreenSchema_1.default);
var Sponsor = mongoose.model('Sponsor', SponsorSchema_1.default);
var Staff = mongoose.model('Staff', StaffSchema_1.default);
var Theater = mongoose.model('Theater', TheaterSchema_1.default);
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    Film: Film,
    Member: Member,
    Performance: Performance,
    Reservation: Reservation,
    Screen: Screen,
    Sponsor: Sponsor,
    Staff: Staff,
    Theater: Theater,
};
