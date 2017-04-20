/**
 * 先行予約ログインフォーム
 *
 * @ignore
 */

import { Request } from 'express';

export default (req: Request) => {
    // userId
    req.checkBody('userId', req.__('Message.required{{fieldName}}', { fieldName: req.__('Form.FieldName.userId') })).notEmpty();

    // password
    req.checkBody('password', req.__('Message.required{{fieldName}}', { fieldName: req.__('Form.FieldName.password') })).notEmpty();

    // language
    req.checkBody('language', req.__('Message.required{{fieldName}}', { fieldName: req.__('Form.FieldName.language') })).notEmpty();

};
