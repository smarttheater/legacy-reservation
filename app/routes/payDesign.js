"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const querystring = require("querystring");
const PayDesignReserveController_1 = require("../controllers/PayDesign/Reserve/PayDesignReserveController");
exports.default = (app) => {
    app.post('/PayDesign/reserve/notify', (req, res, next) => {
        let content = new Buffer([]);
        req.on('data', (chunk) => {
            content = Buffer.concat([content, chunk]);
        });
        req.on('end', () => __awaiter(this, void 0, void 0, function* () {
            // tslint:disable-next-line:no-require-imports
            const jconv = require('jconv');
            // utf8変換
            const converted = jconv.convert(content, 'SJIS', 'UTF8');
            req.body = querystring.parse(converted.toString('utf8'));
            yield (new PayDesignReserveController_1.default(req, res, next)).notify();
        }));
    });
    app.post('/PayDesign/reserve/cancel', (req, res, next) => {
        let content = new Buffer([]);
        req.on('data', (chunk) => {
            content = Buffer.concat([content, chunk]);
        });
        req.on('end', () => __awaiter(this, void 0, void 0, function* () {
            // tslint:disable-next-line:no-require-imports
            const jconv = require('jconv');
            // utf8変換
            const converted = jconv.convert(content, 'SJIS', 'UTF8');
            req.body = querystring.parse(converted.toString('utf8'));
            yield (new PayDesignReserveController_1.default(req, res, next)).cancel();
        }));
    });
};
