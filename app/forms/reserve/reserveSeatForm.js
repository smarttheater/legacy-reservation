"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * 座席予約座席選択フォーム
 *
 * @ignore
 */
const form = require("express-form");
exports.default = form(form.field('seatCodes').trim().required());
