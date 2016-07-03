import form = require('express-form');

export default form(
    form.field('performanceId').trim().required()
);
