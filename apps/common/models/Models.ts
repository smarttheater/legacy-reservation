/**
 * MongoDBのモデルをまとめたモジュール
 */
import mongoose = require('mongoose');

import FilmSchema from '../models/Film/FilmSchema';
import PerformanceSchema from '../models/Performance/PerformanceSchema';
import ReservationSchema from '../models/Reservation/ReservationSchema';
import ScreenSchema from '../models/Screen/ScreenSchema';
import TheaterSchema from '../models/Theater/TheaterSchema';

let Film = mongoose.model('Film', FilmSchema);
let Performance = mongoose.model('Performance', PerformanceSchema);
let Reservation = mongoose.model('Reservation', ReservationSchema);
let Screen = mongoose.model('Screen', ScreenSchema);
let Theater = mongoose.model('Theater', TheaterSchema);

export default {
    Film,
    Performance,
    Reservation,
    Screen,
    Theater,
};