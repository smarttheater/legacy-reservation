import BaseForm from '../../BaseForm';

export default class StaffReserveSeatForm extends BaseForm {
    public constructor() {
        super();

        let fields = this.forms.fields;
        let validators = this.forms.validators;
        let widgets = this.forms.widgets;

        this.form = this.forms.create(
            {
                codes: fields.string({
                    label: '座席コードリスト',
                    widget: widgets.hidden(),
                    required: true,
                    validators: [
                    ]
                })
            },
            this.options
        );
    }
}
