"use strict";
var form = require('express-form');
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = function (req) {
    return form(form.field('userId', req.__('Form.FieldName.userId')).trim().required('', req.__('Message.required{{fieldName}}', { fieldName: '%s' })), form.field('password', req.__('Form.FieldName.password')).trim().required('', req.__('Message.required{{fieldName}}', { fieldName: '%s' })), form.field('signature', req.__('Form.FieldName.signature')).trim().required('', req.__('Message.required{{fieldName}}', { fieldName: '%s' })));
};
