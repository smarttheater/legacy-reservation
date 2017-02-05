"use strict";
const form = require("express-form");
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = (req) => {
    return form(form.field('isAgree').trim().required('', req.__('Message.RequiredAgree')).regex(/^on$/, 'Message.RequiredAgree'));
};
