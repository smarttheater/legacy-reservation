/**
 * MongoDBのモデルをまとめたモジュール
 */
import mongoose = require('mongoose');

import AuthenticationSchema from '../models/Authentication/AuthenticationSchema';
import FilmSchema from '../models/Film/FilmSchema';
import MemberSchema from '../models/Member/MemberSchema';
import PerformanceSchema from '../models/Performance/PerformanceSchema';
import ReservationSchema from '../models/Reservation/ReservationSchema';
import ReservationEmailCueSchema from '../models/ReservationEmailCue/ReservationEmailCueSchema';
import ScreenSchema from '../models/Screen/ScreenSchema';
import SequenceSchema from '../models/Sequence/SequenceSchema';
import SponsorSchema from '../models/Sponsor/SponsorSchema';
import StaffSchema from '../models/Staff/StaffSchema';
import TelStaffSchema from '../models/TelStaff/TelStaffSchema';
import TheaterSchema from '../models/Theater/TheaterSchema';
import TicketTypeGroupSchema from '../models/TicketTypeGroup/TicketTypeGroupSchema';
import WindowSchema from '../models/Window/WindowSchema';

let Authentication = mongoose.model('Authentication', AuthenticationSchema);
let Film = mongoose.model('Film', FilmSchema);
let Member = mongoose.model('Member', MemberSchema);
let Performance = mongoose.model('Performance', PerformanceSchema);
let Reservation = mongoose.model('Reservation', ReservationSchema);
let ReservationEmailCue = mongoose.model('ReservationEmailCue', ReservationEmailCueSchema);
let Screen = mongoose.model('Screen', ScreenSchema);
let Sequence = mongoose.model('Sequence', SequenceSchema);
let Sponsor = mongoose.model('Sponsor', SponsorSchema);
let Staff = mongoose.model('Staff', StaffSchema);
let TelStaff = mongoose.model('TelStaff', TelStaffSchema);
let Theater = mongoose.model('Theater', TheaterSchema);
let TicketTypeGroup = mongoose.model('TicketTypeGroup', TicketTypeGroupSchema);
let Window = mongoose.model('Window', WindowSchema);

export default {
    Authentication,
    Film,
    Member,
    Performance,
    Reservation,
    ReservationEmailCue,
    Screen,
    Sequence,
    Sponsor,
    Staff,
    TelStaff,
    Theater,
    TicketTypeGroup,
    Window
};