"use strict";
/**
 * MongoDBのモデルをまとめたモジュール
 */
const mongoose = require('mongoose');
const AuthenticationSchema_1 = require('../models/Authentication/AuthenticationSchema');
const FilmSchema_1 = require('../models/Film/FilmSchema');
const MemberSchema_1 = require('../models/Member/MemberSchema');
const PerformanceSchema_1 = require('../models/Performance/PerformanceSchema');
const ReservationSchema_1 = require('../models/Reservation/ReservationSchema');
const ReservationEmailCueSchema_1 = require('../models/ReservationEmailCue/ReservationEmailCueSchema');
const ScreenSchema_1 = require('../models/Screen/ScreenSchema');
const SequenceSchema_1 = require('../models/Sequence/SequenceSchema');
const SponsorSchema_1 = require('../models/Sponsor/SponsorSchema');
const StaffSchema_1 = require('../models/Staff/StaffSchema');
const TelStaffSchema_1 = require('../models/TelStaff/TelStaffSchema');
const TheaterSchema_1 = require('../models/Theater/TheaterSchema');
const TicketTypeGroupSchema_1 = require('../models/TicketTypeGroup/TicketTypeGroupSchema');
const WindowSchema_1 = require('../models/Window/WindowSchema');
let Authentication = mongoose.model('Authentication', AuthenticationSchema_1.default);
let Film = mongoose.model('Film', FilmSchema_1.default);
let Member = mongoose.model('Member', MemberSchema_1.default);
let Performance = mongoose.model('Performance', PerformanceSchema_1.default);
let Reservation = mongoose.model('Reservation', ReservationSchema_1.default);
let ReservationEmailCue = mongoose.model('ReservationEmailCue', ReservationEmailCueSchema_1.default);
let Screen = mongoose.model('Screen', ScreenSchema_1.default);
let Sequence = mongoose.model('Sequence', SequenceSchema_1.default);
let Sponsor = mongoose.model('Sponsor', SponsorSchema_1.default);
let Staff = mongoose.model('Staff', StaffSchema_1.default);
let TelStaff = mongoose.model('TelStaff', TelStaffSchema_1.default);
let Theater = mongoose.model('Theater', TheaterSchema_1.default);
let TicketTypeGroup = mongoose.model('TicketTypeGroup', TicketTypeGroupSchema_1.default);
let Window = mongoose.model('Window', WindowSchema_1.default);
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    Authentication: Authentication,
    Film: Film,
    Member: Member,
    Performance: Performance,
    Reservation: Reservation,
    ReservationEmailCue: ReservationEmailCue,
    Screen: Screen,
    Sequence: Sequence,
    Sponsor: Sponsor,
    Staff: Staff,
    TelStaff: TelStaff,
    Theater: Theater,
    TicketTypeGroup: TicketTypeGroup,
    Window: Window
};
