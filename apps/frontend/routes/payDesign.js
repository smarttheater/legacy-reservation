"use strict";
const PayDesignReserveController_1 = require("../controllers/PayDesign/Reserve/PayDesignReserveController");
const querystring = require("querystring");
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = (app) => {
    app.post('/PayDesign/reserve/notify', '', (req, res, next) => {
        let content = new Buffer([]);
        req.on('data', (chunk) => {
            content = Buffer.concat([content, chunk]);
        });
        req.on('end', () => {
            let jconv = require('jconv');
            // utf8変換
            let converted = jconv.convert(content, 'SJIS', 'UTF8');
            req.body = querystring.parse(converted.toString('utf8'));
            (new PayDesignReserveController_1.default(req, res, next)).notify();
        });
    });
    app.post('/PayDesign/reserve/cancel', '', (req, res, next) => {
        let content = new Buffer([]);
        req.on('data', (chunk) => {
            content = Buffer.concat([content, chunk]);
        });
        req.on('end', () => {
            let jconv = require('jconv');
            // utf8変換
            let converted = jconv.convert(content, 'SJIS', 'UTF8');
            req.body = querystring.parse(converted.toString('utf8'));
            (new PayDesignReserveController_1.default(req, res, next)).cancel();
        });
    });
};
