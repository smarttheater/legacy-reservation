"use strict";
var form = require('express-form');
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = form(form.field('reservationIds').trim().required());
