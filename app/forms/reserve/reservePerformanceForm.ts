/**
 * 座席予約パフォーマンス選択フォーム
 *
 * viewに物理的にフォームはないが、hiddenフォームとして扱っている
 *
 * @ignore
 */
import * as form from 'express-form';

export default form(
    form.field('performanceId').trim().required(),
    form.field('locale').trim()
);
