"use strict";
/**
 * 座席予約座席選択フォーム
 *
 * @ignore
 */
const form = require("express-form");
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = form(form.field('seatCodes').trim().required());
