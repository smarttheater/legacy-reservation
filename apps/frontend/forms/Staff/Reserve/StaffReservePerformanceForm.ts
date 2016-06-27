import BaseForm from '../../BaseForm';

export default class StaffReservePerformanceForm extends BaseForm {
    public constructor() {
        super();

        let fields = this.forms.fields;
        let validators = this.forms.validators;
        let widgets = this.forms.widgets;

        this.form = this.forms.create(
            {
                performance_id: fields.string({
                    label: 'パフォーマンス',
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
