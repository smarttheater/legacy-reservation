import BaseForm from '../../BaseForm';

export default class CustomerReserveSeatForm extends BaseForm {
    public constructor() {
        super();

        let fields = this.forms.fields;
        let validators = this.forms.validators;
        let widgets = this.forms.widgets;

        this.form = this.forms.create(
            {
                method: fields.string({
                    label: '決済方法',
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
