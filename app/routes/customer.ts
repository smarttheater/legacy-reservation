/**
 * customerルーティング
 *
 * @ignore
 */
import * as conf from 'config';
import { Request, Response, Router } from 'express';
import * as customerCancelController from '../controllers/customer/cancel';
import * as customerReserveController from '../controllers/customer/reserve';
import * as customerReserveGmoController from '../controllers/customer/reserve/gmo';

const customerRouter = Router();

// 本体サイトのトップページの言語別URL
const topUrlByLocale = conf.get<any>('official_url_top_by_locale');
// 本体サイトのプライバシーポリシーページの言語別URL
const privacyPolicyUrlByLocale = conf.get<any>('official_url_privacypolicy_by_locale');
// 本体サイトのお問い合わせページの言語別URL
const contactUrlByLocale = conf.get<any>('official_url_contact_by_locale');

// 本番環境ではhomeは存在しない
if (process.env.NODE_ENV !== 'production') {
    customerRouter.all('/reserve/performances/:category', customerReserveController.performances);
    //customerRouter.post('/reserve/performances/:category', customerReserveController.performances);
}
customerRouter.get('/reserve/start', customerReserveController.start);
//2017/05/11 座席選択削除
//customerRouter.all('/reserve/terms', customerReserveController.terms);
//customerRouter.all('/reserve/seats', customerReserveController.seats);
//---
customerRouter.all('/reserve/tickets', customerReserveController.tickets);
customerRouter.all('/reserve/profile', customerReserveController.profile);
customerRouter.all('/reserve/confirm', customerReserveController.confirm);
customerRouter.get('/reserve/:performanceDay/:paymentNo/waitingSettlement', customerReserveController.waitingSettlement);
customerRouter.get('/reserve/:performanceDay/:paymentNo/complete', customerReserveController.complete);

customerRouter.post('/reserve/gmo/start', customerReserveGmoController.start);
customerRouter.post('/reserve/gmo/result', customerReserveGmoController.result);
customerRouter.get('/reserve/gmo/:orderId/cancel', customerReserveGmoController.cancel);

customerRouter.all('/cancel', customerCancelController.index);
customerRouter.post('/cancel/executeByPaymentNo', customerCancelController.executeByPaymentNo);

// 利用規約ページ
customerRouter.get('/terms/', (req: Request, res: Response) => {
    return res.render('customer/terms/');
});

// 本体サイトのプライバシーポリシーページの対応言語版(無ければ英語版)に転送
customerRouter.get('/privacypolicy', (req: Request, res: Response) => {
    const locale: string = (req.getLocale()) || 'en';
    const url: string = (privacyPolicyUrlByLocale[locale] || privacyPolicyUrlByLocale.en);

    return res.redirect(url);
});

// 本体サイトのお問い合わせページの対応言語版(無ければ英語版)に転送
customerRouter.get('/contact', (req: Request, res: Response) => {
    const locale: string = (req.getLocale()) || 'en';
    const url: string = (contactUrlByLocale[locale] || contactUrlByLocale.en);

    return res.redirect(url);
});

// 本体サイトトップページの対応言語版(無ければ英語版)に転送
customerRouter.get('/returntop', (req: Request, res: Response) => {
    const locale: string = (req.getLocale()) || 'en';
    const url: string = (topUrlByLocale[locale] || topUrlByLocale.en);

    return res.redirect(url);
});

export default customerRouter;
