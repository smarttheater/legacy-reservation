"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * 座席予約パフォーマンス選択フォーム
 *
 * viewに物理的にフォームはないが、hiddenフォームとして扱っている
 *
 * @ignore
 */
const form = require("express-form");
exports.default = form(form.field('performanceId').trim().required(), form.field('locale').trim());
