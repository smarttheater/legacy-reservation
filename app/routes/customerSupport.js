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
const CustomerCancelController_1 = require("../controllers/Customer/Cancel/CustomerCancelController");
exports.default = (app) => {
    // tslint:disable-next-line:variable-name
    const base = (_req, _res, next) => {
        next();
    };
    app.all('/customerSupport/cancel', 'customer.cancel', base, (req, res, next) => { (new CustomerCancelController_1.default(req, res, next)).index(); });
    app.post('/customerSupport/cancel/executeByPaymentNo', 'customer.cancel.executeByPaymentNo', base, (req, res, next) => __awaiter(this, void 0, void 0, function* () { yield (new CustomerCancelController_1.default(req, res, next)).executeByPaymentNo(); }));
};
