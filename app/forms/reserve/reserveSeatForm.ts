/**
 * 座席予約座席選択フォーム
 *
 * @ignore
 */
import * as form from 'express-form';

export default form(
    form.field('seatCodes').trim().required()
);
