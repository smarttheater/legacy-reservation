/**
 * 座席予約券種選択フォーム
 *
 * @ignore
 */
import * as form from 'express-form';

export default form(
    form.field('choices').trim().required()
);
