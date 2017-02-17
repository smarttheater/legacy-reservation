"use strict";
/**
 * 座席予約パフォーマンス選択フォーム
 *
 * viewに物理的にフォームはないが、hiddenフォームとして扱っている
 *
 * @ignore
 */
const form = require("express-form");
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = form(form.field('performanceId').trim().required(), form.field('locale').trim());
