"use strict";
/**
 * MongoDBのモデルをまとめたモジュール
 */
const mongoose = require('mongoose');
const FilmSchema_1 = require('../models/Film/FilmSchema');
const MemberSchema_1 = require('../models/Member/MemberSchema');
const PerformanceSchema_1 = require('../models/Performance/PerformanceSchema');
const ReservationSchema_1 = require('../models/Reservation/ReservationSchema');
const ReservationEmailCueSchema_1 = require('../models/ReservationEmailCue/ReservationEmailCueSchema');
const ScreenSchema_1 = require('../models/Screen/ScreenSchema');
const SponsorSchema_1 = require('../models/Sponsor/SponsorSchema');
const StaffSchema_1 = require('../models/Staff/StaffSchema');
const TheaterSchema_1 = require('../models/Theater/TheaterSchema');
const TicketTypeGroupSchema_1 = require('../models/TicketTypeGroup/TicketTypeGroupSchema');
let Film = mongoose.model('Film', FilmSchema_1.default);
let Member = mongoose.model('Member', MemberSchema_1.default);
let Performance = mongoose.model('Performance', PerformanceSchema_1.default);
let Reservation = mongoose.model('Reservation', ReservationSchema_1.default);
let ReservationEmailCue = mongoose.model('ReservationEmailCue', ReservationEmailCueSchema_1.default);
let Screen = mongoose.model('Screen', ScreenSchema_1.default);
let Sponsor = mongoose.model('Sponsor', SponsorSchema_1.default);
let Staff = mongoose.model('Staff', StaffSchema_1.default);
let Theater = mongoose.model('Theater', TheaterSchema_1.default);
let TicketTypeGroup = mongoose.model('TicketTypeGroup', TicketTypeGroupSchema_1.default);
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    Film: Film,
    Member: Member,
    Performance: Performance,
    Reservation: Reservation,
    ReservationEmailCue: ReservationEmailCue,
    Screen: Screen,
    Sponsor: Sponsor,
    Staff: Staff,
    Theater: Theater,
    TicketTypeGroup: TicketTypeGroup
};
