/**
 * MongoDBのモデルをまとめたモジュール
 */
import mongoose = require('mongoose');

import FilmSchema from '../models/Film/FilmSchema';
import MemberSchema from '../models/Member/MemberSchema';
import PerformanceSchema from '../models/Performance/PerformanceSchema';
import ReservationSchema from '../models/Reservation/ReservationSchema';
import ScreenSchema from '../models/Screen/ScreenSchema';
import SponsorSchema from '../models/Sponsor/SponsorSchema';
import StaffSchema from '../models/Staff/StaffSchema';
import TheaterSchema from '../models/Theater/TheaterSchema';

let Film = mongoose.model('Film', FilmSchema);
let Member = mongoose.model('Member', MemberSchema);
let Performance = mongoose.model('Performance', PerformanceSchema);
let Reservation = mongoose.model('Reservation', ReservationSchema);
let Screen = mongoose.model('Screen', ScreenSchema);
let Sponsor = mongoose.model('Sponsor', SponsorSchema);
let Staff = mongoose.model('Staff', StaffSchema);
let Theater = mongoose.model('Theater', TheaterSchema);

export default {
    Film,
    Member,
    Performance,
    Reservation,
    Screen,
    Sponsor,
    Staff,
    Theater,
};