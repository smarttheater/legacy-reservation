"use strict";
const form = require("express-form");
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = form(form.field('seatCodes').trim().required());
