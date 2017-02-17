"use strict";
/**
 * 座席予約券種選択フォーム
 *
 * @ignore
 */
const form = require("express-form");
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = form(form.field('choices').trim().required());
