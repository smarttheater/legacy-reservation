/**
 * ルーティング
 */
import { Request, Response, Router } from 'express';

import * as languageController from '../controllers/language';

import apiRouter from './api';
import customerRouter from './customer';
import entranceRouter from './entrance';
import externalLinksRouter from './externalLinks';
import healthRouter from './health';
import inquiryRouter from './inquiry';
import reservationsRouter from './reservations';

const NEW_ENDPOINT = process.env.NEW_ENDPOINT;

const router = Router();

router.use((req, res, next) => {
    if (typeof NEW_ENDPOINT === 'string' && NEW_ENDPOINT.length > 0) {
        res.redirect(`${NEW_ENDPOINT}${req.originalUrl}`);

        return;
    }

    next();
});

router.use('/health', healthRouter);

// 言語
router.get('/language/update/:locale', languageController.update);

// ルーティング登録の順序に注意！
router.use('/api', apiRouter);
router.use('/customer', customerRouter);
router.use('/entrance', entranceRouter);

// チケット照会
router.use('/inquiry', inquiryRouter);

// 印刷
router.use('/reservations', reservationsRouter);

// 利用規約ページ
router.get('/terms/', (req: Request, res: Response) => {
    res.locals.req = req;
    // tslint:disable-next-line:no-null-keyword
    res.locals.validation = null;
    res.locals.title = 'Tokyo Tower';
    res.locals.description = 'Terms';
    res.locals.keywords = 'Terms';

    res.render('common/terms/');
});

// 特定商取引法に基づく表示ページ
router.get('/asct/', (req: Request, res: Response) => {
    res.locals.req = req;
    // tslint:disable-next-line:no-null-keyword
    res.locals.validation = null;
    res.locals.title = 'Tokyo Tower';
    res.locals.description = 'Act on Specified Commercial Transactions';
    res.locals.keywords = 'Act on Specified Commercial Transactions';

    res.render('common/asct/');
});

router.use(externalLinksRouter);

export default router;
