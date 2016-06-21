/**
 * MongoDBのモデルをまとめたモジュール
 */
import mongoose = require('mongoose');

import FilmSchema from '../schemas/FilmSchema';
import PerformanceSchema from '../schemas/PerformanceSchema';
import PerformanceSeatSchema from '../schemas/PerformanceSeatSchema';
import ReservationSchema from '../schemas/ReservationSchema';
import ScreenSchema from '../schemas/ScreenSchema';
import TheaterSchema from '../schemas/TheaterSchema';

let Film = mongoose.model('Film', FilmSchema);
let Performance = mongoose.model('Performance', PerformanceSchema);
let PerformanceSeat = mongoose.model('PerformanceSeat', PerformanceSeatSchema);
let Reservation = mongoose.model('Reservation', ReservationSchema);
let Screen = mongoose.model('Screen', ScreenSchema);
let Theater = mongoose.model('Theater', TheaterSchema);

export default {
    Film,
    Performance,
    PerformanceSeat,
    Reservation,
    Screen,
    Theater,
};