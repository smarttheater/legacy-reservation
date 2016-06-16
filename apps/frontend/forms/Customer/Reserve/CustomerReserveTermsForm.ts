import BaseForm from '../../BaseForm';

export default class CustomerReserveTermsForm extends BaseForm {
    public constructor() {
        super();

        let fields = this.forms.fields;
        let validators = this.forms.validators;
        let widgets = this.forms.widgets;

        this.form = this.forms.create(
            {
                agree: fields.boolean({
                    label: '同意する',
                    widget: widgets.checkbox(),
                    required: true,
                    validators: [
                    ]
                })
            },
            this.options
        );
    }
}
