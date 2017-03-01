"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * 座席予約券種選択フォーム
 *
 * @ignore
 */
const form = require("express-form");
exports.default = form(form.field('choices').trim().required());
