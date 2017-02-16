"use strict";
const form = require("express-form");
const NAME_MAX_LENGTH = 15;
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = (req) => {
    return form(form.field('lastName', req.__('Form.FieldName.lastName')).trim()
        .required('', req.__('Message.required{{fieldName}}', { fieldName: '%s' }))
        .maxLength(NAME_MAX_LENGTH, req.__('Message.maxLength{{fieldName}}{{max}}', { fieldName: '%s', max: NAME_MAX_LENGTH.toString() }))
        .regex(/^[ァ-ロワヲンーa-zA-Z]*$/, req.__('Message.invalid{{fieldName}}', { fieldName: '%s' })), form.field('firstName', req.__('Form.FieldName.firstName')).trim()
        .required('', req.__('Message.required{{fieldName}}', { fieldName: '%s' }))
        .maxLength(NAME_MAX_LENGTH, req.__('Message.maxLength{{fieldName}}{{max}}', { fieldName: '%s', max: NAME_MAX_LENGTH.toString() }))
        .regex(/^[ァ-ロワヲンーa-zA-Z]*$/, req.__('Message.invalid{{fieldName}}', { fieldName: '%s' })), form.field('tel', req.__('Form.FieldName.tel')).trim()
        .required('', req.__('Message.required{{fieldName}}', { fieldName: '%s' }))
        .regex(/^[0-9]{7,13}$/, req.__('Message.regexTel')), form.field('email', req.__('Form.FieldName.email')).trim()
        .required('', req.__('Message.required{{fieldName}}', { fieldName: '%s' }))
        .isEmail(req.__('Message.invalid{{fieldName}}', { fieldName: '%s' }))
        .custom((value, source, callback) => {
        if (value !== `${source.emailConfirm}@${source.emailConfirmDomain}`) {
            callback(new Error(req.__('Message.match{{fieldName}}', { fieldName: '%s' })));
        }
        else {
            callback(null);
        }
    }), form.field('emailConfirm', req.__('Form.FieldName.emailConfirm')).trim()
        .required('', req.__('Message.required{{fieldName}}', { fieldName: '%s' })), form.field('emailConfirmDomain', req.__('Form.FieldName.emailConfirmDomain')).trim()
        .required('', req.__('Message.required{{fieldName}}', { fieldName: '%s' })), form.field('paymentMethod', req.__('Form.FieldName.paymentMethod')).trim()
        .required('', req.__('Message.required{{fieldName}}', { fieldName: '%s' })), form.field('age', req.__('Form.FieldName.age')).trim()
        .required('', req.__('Message.required{{fieldName}}', { fieldName: '%s' })), form.field('address', req.__('Form.FieldName.address')).trim(), form.field('gender', req.__('Form.FieldName.gender')).trim());
};
