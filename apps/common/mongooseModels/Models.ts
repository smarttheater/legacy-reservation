/**
 * MongoDBのモデルをまとめたモジュール
 */
import mongoose = require('mongoose');

import FilmSchema from '../schemas/FilmSchema';
import PerformanceSchema from '../schemas/PerformanceSchema';
import ScreenSchema from '../schemas/ScreenSchema';
import TheaterSchema from '../schemas/TheaterSchema';

let Film = mongoose.model('Film', FilmSchema);
let Performance = mongoose.model('Performance', PerformanceSchema);
let Screen = mongoose.model('Screen', ScreenSchema);
let Theater = mongoose.model('Theater', TheaterSchema);

export default {
    Film,
    Performance,
    Screen,
    Theater,
};