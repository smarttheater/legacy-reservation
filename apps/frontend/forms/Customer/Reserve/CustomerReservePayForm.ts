import BaseForm from '../../BaseForm';

export default class CustomerReservePayForm extends BaseForm {
    public constructor() {
        super();

        let fields = this.forms.fields;
        let validators = this.forms.validators;
        let widgets = this.forms.widgets;

        this.form = this.forms.create(
            {
                method: fields.string({
                    label: '決済方法',
                    widget: widgets.multipleRadio(),
                    required: true,
                    validators: [
                    ],
                    choices: {
                        '01': 'クレジットカード決済',
                        '02': '???',
                        '03': '???',
                    }
                })
            },
            this.options
        );
    }
}
