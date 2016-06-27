import BaseForm from '../../BaseForm';

export default class SponsorReserveCancelForm extends BaseForm {
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
                payment_no: fields.string({
                    label: '予約番号',
                    required: validators.required('ログイン番号が未入力です'),
                    validators: [
                    ],
                }),
                tel: fields.string({
                    label: '電話番号下4ケタ',
                    widget: widgetPassword,
                    required: validators.required('パスワードが未入力です'),
                    validators: [
                    ],
                })
            },
            this.options
        );
    }
}
