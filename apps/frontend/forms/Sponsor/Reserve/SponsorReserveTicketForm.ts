import BaseForm from '../../BaseForm';

export default class SponsorReserveTicketForm extends BaseForm {
    public constructor() {
        super();

        let fields = this.forms.fields;
        let validators = this.forms.validators;
        let widgets = this.forms.widgets;

        this.form = this.forms.create(
            {
                choices: fields.string({
                    label: '券種選択リスト',
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
