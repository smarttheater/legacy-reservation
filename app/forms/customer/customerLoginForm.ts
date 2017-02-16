import * as express from 'express';
import * as form from 'express-form';

export default (req: express.Request) => {
    return form(
        form.field('email', req.__('Form.FieldName.email')).trim().required('', req.__('Message.required{{fieldName}}', {fieldName: '%s'})),
        form.field('password', req.__('Form.FieldName.password')).trim().required('', req.__('Message.required{{fieldName}}', {fieldName: '%s'}))
    );
};
