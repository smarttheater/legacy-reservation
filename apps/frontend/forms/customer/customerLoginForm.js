"use strict";
const form = require("express-form");
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = (req) => {
    return form(form.field('email', req.__('Form.FieldName.email')).trim().required('', req.__('Message.required{{fieldName}}', { fieldName: '%s' })), form.field('password', req.__('Form.FieldName.password')).trim().required('', req.__('Message.required{{fieldName}}', { fieldName: '%s' })));
};
