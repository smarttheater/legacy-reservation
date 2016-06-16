import forms = require('forms');
import MwsrUtil from '../../common/Util/Util';

/**
 * フォームベースクラス
 */
export default class BaseForm {
    public form: forms.IForm;
    protected forms: forms.IForms;
    protected options: Object;

    constructor() {
        this.forms = forms;
        this.options = {
            validatePastFirstError: true
        };

        // 両端の空白を取り除くバリデータ
        this.forms.validators.trim = () => {
            return (form, field, callback) => {
                field.value = field.data.trim();
                field.data = field.data.trim();
                form.data[field.name] = field.data.trim();
                callback();
            };
        }
    }

    /**
     * 月選択項目の選択肢を取得する
     */
    protected getMonthChoices(): Object {
        return {
            '01': '01',
            '02': '02',
            '03': '03',
            '04': '04',
            '05': '05',
            '06': '06',
            '07': '07',
            '08': '08',
            '09': '09',
            '10': '10',
            '11': '11',
            '12': '12'
        };
    }
}
