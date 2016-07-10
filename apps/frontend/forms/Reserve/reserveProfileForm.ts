import express = require('express');
import form = require('express-form');

export default (req: express.Request) => {
    return form(
        form.field('lastName').trim()
            .required('', req.__('Message.required{{fieldName}}', {fieldName: req.__('Form.FieldName.lastName')}))
            .maxLength(15, req.__('Message.maxLength{{fieldName}}{{max}}', {fieldName: req.__('Form.FieldName.lastName'), max: '15'})),
        form.field('firstName').trim()
            .required('', req.__('Message.required{{fieldName}}', {fieldName: req.__('Form.FieldName.firstName')}))
            .maxLength(15, req.__('Message.maxLength{{fieldName}}{{max}}', {fieldName: req.__('Form.FieldName.firstName'), max: '15'})),
        form.field('tel').trim()
            .required('', req.__('Message.required{{fieldName}}', {fieldName: req.__('Form.FieldName.tel')}))
            .regex(/^[0-9]{7,13}$/, req.__('Message.regexTelRange{{fieldName}}{{min}}{{max}}', {fieldName: req.__('Form.FieldName.tel'), min: '7', max: '13'})),
        form.field('email').trim()
            .required('', req.__('Message.required{{fieldName}}', {fieldName: req.__('Form.FieldName.email')}))
            .isEmail(req.__('Message.invalid{{fieldName}}', {fieldName: req.__('Form.FieldName.email')}))
            .custom((value, source, callback) => {
                if (value !== `${source.emailConfirm}@${source.emailConfirmDomain}`) {
                    callback(new Error(req.__('Message.match{{fieldName}}', {fieldName: req.__('Form.FieldName.email')})));
                } else {
                    callback(null);
                }
            }),
        form.field('emailConfirm').trim()
            .required('', req.__('Message.required{{fieldName}}', {fieldName: req.__('Form.FieldName.emailConfirm')})),
        form.field('emailConfirmDomain').trim()
            .required('', req.__('Message.required{{fieldName}}', {fieldName: req.__('Form.FieldName.emailConfirmDomain')}))
    );
}
