import BaseForm from '../../BaseForm';

export default class CustomerReserveProfileForm extends BaseForm {
    public constructor() {
        super();

        let fields = this.forms.fields;
        let validators = this.forms.validators;
        let widgets = this.forms.widgets;

        this.form = this.forms.create(
            {
                token: fields.string({
                    label: 'トークン',
                    widget: widgets.hidden(),
                    required: false,
                    validators: [
                    ]
                })
            },
            this.options
        );
    }
}
