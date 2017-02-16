import * as form from 'express-form';

export default form(
    form.field('seatCodes').trim().required()
);
