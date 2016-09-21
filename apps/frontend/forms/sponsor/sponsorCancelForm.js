"use strict";
const form = require('express-form');
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = (req) => {
    return form(form.field('paymentNo', req.__('Form.FieldName.userId')).trim()
        .required('', req.__('Message.required{{fieldName}}', { fieldName: '%s' })), form.field('last4DigitsOfTel', req.__('Form.FieldName.last4DigitsOfTel')).trim()
        .required('', req.__('Message.required{{fieldName}}', { fieldName: '%s' }))
        .regex(/^[0-9]{4}$/, req.__('Message.regexTelRange{{fieldName}}{{min}}{{max}}', { fieldName: '%s', min: '4', max: '4' })));
};
