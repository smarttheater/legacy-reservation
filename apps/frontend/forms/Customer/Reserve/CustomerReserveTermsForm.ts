import form = require('express-form');

export default form(
    form.field('isAgree').trim().required('', '同意してください').is(/^on$/, '同意してください')
);
