/**
 * 座席予約規約同意フォーム
 *
 * @ignore
 */
import {Request} from 'express';
import * as form from 'express-form';

export default (req: Request) => {
    return form(
        form.field('isAgree').trim().required('', req.__('Message.RequiredAgree')).regex(/^on$/, 'Message.RequiredAgree')
    );
};
