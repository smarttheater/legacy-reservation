"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const form = require("express-form");
exports.default = (req) => {
    return form(form.field('isAgree').trim().required('', req.__('Message.RequiredAgree')).regex(/^on$/, 'Message.RequiredAgree'));
};
