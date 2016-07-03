import form = require('express-form');

export default form(
    form.field('choices').trim().required()
);
