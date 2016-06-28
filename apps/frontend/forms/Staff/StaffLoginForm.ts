import BaseForm from '../BaseForm';

export default class StaffLoginForm extends BaseForm {
    public constructor() {
        super();

        let fields = this.forms.fields;
        let validators = this.forms.validators;
        let widgets = this.forms.widgets;

        let widgetPassword = widgets.password();
        widgetPassword.formatValue = function (value) {
            return (value || value === 0) ? value : null;
        };

        this.form = this.forms.create(
            {
                user_id: fields.string({
                    label: 'ログイン番号',
                    required: validators.required('ログイン番号が未入力です'),
                    validators: [
                    ],
                }),
                password: fields.string({
                    label: 'パスワード',
                    widget: widgetPassword,
                    required: validators.required('パスワードが未入力です'),
                    validators: [
                    ],
                }),
                signature: fields.string({
                    label: '署名',
                    required: validators.required('署名が未入力です'),
                    validators: [
                    ],
                })
            },
            this.options
        );
    }
}
