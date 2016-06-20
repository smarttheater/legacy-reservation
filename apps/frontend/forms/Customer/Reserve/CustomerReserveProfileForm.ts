import BaseForm from '../../BaseForm';

export default class CustomerReserveProfileForm extends BaseForm {
    public constructor() {
        super();

        let fields = this.forms.fields;
        let validators = this.forms.validators;
        let widgets = this.forms.widgets;

        validators.matchEmail = () => {
            return (form, field, callback) => {
                if (form.fields.email.data !== `${form.fields.emailConfirm.data}@${form.fields.emailConfirmDomain.data}`) {
                    callback('メールアドレスが一致しません');
                } else {
                    callback();
                }
            };
        };

        this.form = this.forms.create(
            {
                last_name: fields.string({
                    label: 'せい',
                    widget: widgets.text(),
                    required: validators.required('せいが未入力です'),
                    validators: [
                        validators.trim(),
                        validators.maxlength(15, 'せいは15文字以内で入力してください')
                    ]
                }),
                first_name: fields.string({
                    label: 'めい',
                    widget: widgets.text(),
                    required: validators.required('めいが未入力です'),
                    validators: [
                        validators.trim(),
                        validators.maxlength(15, 'めいは15文字以内で入力してください')
                    ]
                }),
                tel: fields.string({
                    label: '電話番号',
                    widget: widgets.text(),
                    required: validators.required('電話番号が未入力です'),
                    validators: [
                        validators.trim(),
                        validators.regexp(/^[0-9]{7,13}$/, '電話番号は数字7～13桁で入力してください'),
                    ]
                }),
                email: fields.string({
                    label: 'メールアドレス',
                    widget: widgets.text(),
                    required: validators.required('メールアドレスが未入力です'),
                    validators: [
                        validators.trim(),
                        validators.email('メールアドレスが不適切です'),
                        validators.matchEmail()
                    ]
                }),
                emailConfirm: fields.string({
                    label: 'メールアドレス(確認)',
                    widget: widgets.text(),
                    required: validators.required('メールアドレス(確認)が未入力です'),
                    validators: [
                        validators.trim(),
                    ]
                }),
                emailConfirmDomain: fields.string({
                    label: 'メールアドレスドメイン(確認)',
                    widget: widgets.text(),
                    required: validators.required('メールアドレス(確認)が未入力です'),
                    validators: [
                        validators.trim(),
                    ]
                }),
            },
            this.options
        );
    }
}
