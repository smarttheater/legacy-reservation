/**
 * 電話窓口ログインフォーム
 *
 * @ignore
 */
import {Request} from 'express';
import * as form from 'express-form';

export default (req: Request) => {
    return form(
        form.field('userId', req.__('Form.FieldName.userId')).trim().required('', req.__('Message.required{{fieldName}}', { fieldName: '%s' })),
        form.field('password', req.__('Form.FieldName.password')).trim().required('', req.__('Message.required{{fieldName}}', { fieldName: '%s' })),
        form.field('remember', req.__('Form.FieldName.remember'))
    );
};
