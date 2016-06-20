/**
 * MongoDBのモデルをまとめたモジュール
 */
import mongoose = require('mongoose');

import FilmSchema from '../schemas/FilmSchema';
import PerformanceSchema from '../schemas/PerformanceSchema';
import PerformanceSeatSchema from '../schemas/PerformanceSeatSchema';
import ScreenSchema from '../schemas/ScreenSchema';
import TheaterSchema from '../schemas/TheaterSchema';

let Film = mongoose.model('Film', FilmSchema);
let Performance = mongoose.model('Performance', PerformanceSchema);
let PerformanceSeat = mongoose.model('PerformanceSeat', PerformanceSeatSchema);
let Screen = mongoose.model('Screen', ScreenSchema);
let Theater = mongoose.model('Theater', TheaterSchema);

export default {
    Film,
    Performance,
    PerformanceSeat,
    Screen,
    Theater,
};