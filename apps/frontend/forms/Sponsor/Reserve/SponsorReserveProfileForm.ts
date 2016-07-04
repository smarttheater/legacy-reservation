import form = require('express-form');

export default form(
    form.field('lastName').trim().required('', 'せいが未入力です').maxLength(15, 'せいは15文字以内で入力してください'),
    form.field('firstName').trim().required('', 'めいが未入力です').maxLength(15, 'めいは15文字以内で入力してください'),
    form.field('tel').trim().required('', '電話番号が未入力です').regex(/^[0-9]{7,13}$/, '電話番号は数字7～13桁で入力してください'),
    form.field('email').trim().required('', 'メールアドレスが未入力です').isEmail('メールアドレスが不適切です').custom((value, source, callback) => {
        if (value !== `${source.emailConfirm}@${source.emailConfirmDomain}`) {
            callback(new Error('メールアドレスが一致しません'));
        } else {
            callback(null);
        }
    }),
    form.field('emailConfirm').trim().required('', 'メールアドレス(確認)が未入力です'),
    form.field('emailConfirmDomain').trim().required('', 'メールアドレス(確認)が未入力です')
);
