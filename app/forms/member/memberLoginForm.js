"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * メルマガ先行会員ログインフォーム
 *
 * @ignore
 */
const form = require("express-form");
exports.default = form(form.field('userId').trim().required('', 'ログイン番号が未入力です'), form.field('password').trim().required('', 'パスワードが未入力です'));
