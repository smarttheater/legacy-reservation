import form = require('express-form');

export default form(
    form.field('seatCodes').trim().required()
);
