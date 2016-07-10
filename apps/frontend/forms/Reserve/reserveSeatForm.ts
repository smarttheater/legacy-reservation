import form = require('express-form');

export default form(
    form.field('reservationIds').trim().required()
);
