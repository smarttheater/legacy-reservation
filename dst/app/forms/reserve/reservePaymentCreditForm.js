"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = (req) => {
    req.checkBody('gmoTokenObject').notEmpty();
};
