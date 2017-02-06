import express = require('express');
import form = require('express-form');

export default (req: express.Request) => {
    return form(
        form.field('userId', req.__('Form.FieldName.userId')).trim().required('', req.__('Message.required{{fieldName}}', {fieldName: '%s'})),
        form.field('password', req.__('Form.FieldName.password')).trim().required('', req.__('Message.required{{fieldName}}', {fieldName: '%s'})),
        form.field('language', req.__('Form.FieldName.language')).trim().required('', req.__('Message.required{{fieldName}}', {fieldName: '%s'})),
        form.field('remember', req.__('Form.FieldName.remember'))
    );
}
