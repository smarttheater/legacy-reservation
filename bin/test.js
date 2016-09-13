"use strict";
const request = require("request");
let options = {
    url: 'https://devtiffwebapp.azurewebsites.net/api/login',
    form: {
        email: 'ilovegadd@gmail.com',
        password: 'uhbnmj12',
    }
};
request.post(options, (error, response, body) => {
    console.log(body);
});
