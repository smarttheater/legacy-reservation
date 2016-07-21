"use strict";
var form = require('express-form');
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = function (req) {
    return form(form.field('isAgree').trim().required('', req.__('Message.RequiredAgree')).regex(/^on$/, 'Message.RequiredAgree'));
};
