import PayDesignReserveController from  '../controllers/PayDesign/Reserve/PayDesignReserveController';
import querystring = require('querystring');

export default (app: any) => {
    // ペイデザインプロセス
    app.all('/PayDesign/reserve/test', 'paydesign.reserve.test', (req, res, next) => {(new PayDesignReserveController(req, res, next)).test()});

    app.post('/PayDesign/reserve/notify', '', (req, res, next) => {
        let content = new Buffer([]);;
        req.on('data', (chunk) => {
            content = Buffer.concat([content, chunk]);
        });

        req.on('end', () => {
            let jconv = require('jconv');
            // utf8変換
            let converted = jconv.convert(content, 'SJIS', 'UTF8');
            req.body = querystring.parse(converted.toString('utf8'));
            (new PayDesignReserveController(req, res, next)).notify();
        })
    });

    app.post('/PayDesign/reserve/cancel', '', (req, res, next) => {
        let content = new Buffer([]);;
        req.on('data', (chunk) => {
            content = Buffer.concat([content, chunk]);
        });

        req.on('end', () => {
            let jconv = require('jconv');
            // utf8変換
            let converted = jconv.convert(content, 'SJIS', 'UTF8');
            req.body = querystring.parse(converted.toString('utf8'));
            (new PayDesignReserveController(req, res, next)).cancel();
        })
    });
}
