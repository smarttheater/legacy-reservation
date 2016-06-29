import BaseForm from '../../BaseForm';

export default class CustomerReserveSeatForm extends BaseForm {
    public constructor() {
        super();

        let fields = this.forms.fields;
        let validators = this.forms.validators;
        let widgets = this.forms.widgets;

        this.form = this.forms.create(
            {
                reservationIds: fields.string({
                    label: '予約IDリスト',
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
