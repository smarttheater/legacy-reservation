/**
 * MongoDBのモデルをまとめたモジュール
 */
let mongoose = require('mongoose');

import FilmSchema from '../schemas/FilmSchema';
import PerformanceSchema from '../schemas/PerformanceSchema';

let Film = mongoose.model('Film', FilmSchema);
let Performance = mongoose.model('Performance', PerformanceSchema);

export default {Film, Performance};

