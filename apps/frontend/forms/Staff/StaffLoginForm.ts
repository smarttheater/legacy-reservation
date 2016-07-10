import express = require('express');
import form = require('express-form');

export default (req: express.Request) => {
    return form(
        form.field('userId').trim().required('', req.__('Message.required{{fieldName}}', {fieldName: req.__('Form.FieldName.userId')})),
        form.field('password').trim().required('', req.__('Message.required{{fieldName}}', {fieldName: req.__('Form.FieldName.password')})),
        form.field('signature').trim().required('', req.__('Message.required{{fieldName}}', {fieldName: req.__('Form.FieldName.signature')}))
    );
}
