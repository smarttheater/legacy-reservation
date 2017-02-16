import * as form from 'express-form';

export default form(
    form.field('choices').trim().required()
);
