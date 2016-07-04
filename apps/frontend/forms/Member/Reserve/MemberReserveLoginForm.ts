import form = require('express-form');

export default form(
    form.field('userId').trim().required('', 'ログイン番号が未入力です'),
    form.field('password').trim().required('', 'パスワードが未入力です')
);
