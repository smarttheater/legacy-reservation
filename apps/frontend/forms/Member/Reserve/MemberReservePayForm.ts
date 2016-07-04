import form = require('express-form');

export default form(
    form.field('method').trim().required()
);
