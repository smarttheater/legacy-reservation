"use strict";
var form = require('express-form');
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = function (req) {
    return form(form.field('lastName', req.__('Form.FieldName.lastName')).trim()
        .required('', req.__('Message.required{{fieldName}}', { fieldName: '%s' }))
        .maxLength(15, req.__('Message.maxLength{{fieldName}}{{max}}', { fieldName: '%s', max: '15' })), form.field('firstName', req.__('Form.FieldName.firstName')).trim()
        .required('', req.__('Message.required{{fieldName}}', { fieldName: '%s' }))
        .maxLength(15, req.__('Message.maxLength{{fieldName}}{{max}}', { fieldName: '%s', max: '15' })), form.field('tel', req.__('Form.FieldName.tel')).trim()
        .required('', req.__('Message.required{{fieldName}}', { fieldName: '%s' }))
        .regex(/^[0-9]{7,13}$/, req.__('Message.regexTelRange{{fieldName}}{{min}}{{max}}', { fieldName: '%s', min: '7', max: '13' })), form.field('email', req.__('Form.FieldName.email')).trim()
        .required('', req.__('Message.required{{fieldName}}', { fieldName: '%s' }))
        .isEmail(req.__('Message.invalid{{fieldName}}', { fieldName: '%s' }))
        .custom(function (value, source, callback) {
        if (value !== source.emailConfirm + "@" + source.emailConfirmDomain) {
            callback(new Error(req.__('Message.match{{fieldName}}', { fieldName: '%s' })));
        }
        else {
            callback(null);
        }
    }), form.field('emailConfirm', req.__('Form.FieldName.emailConfirm')).trim()
        .required('', req.__('Message.required{{fieldName}}', { fieldName: '%s' })), form.field('emailConfirmDomain', req.__('Form.FieldName.emailConfirmDomain')).trim()
        .required('', req.__('Message.required{{fieldName}}', { fieldName: '%s' })));
};
