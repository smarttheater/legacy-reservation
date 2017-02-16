import * as express from 'express';
import * as form from 'express-form';

export default (req: express.Request) => {
    return form(
        form.field('isAgree').trim().required('', req.__('Message.RequiredAgree')).regex(/^on$/, 'Message.RequiredAgree')
    );
};
