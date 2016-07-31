"use strict";
const form = require('express-form');
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = form(form.field('userId').trim().required('', 'ログイン番号が未入力です'), form.field('password').trim().required('', 'パスワードが未入力です'));
