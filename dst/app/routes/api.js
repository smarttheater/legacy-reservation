"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * アプリ内APIルーティング
 */
const tttsapi = require("@motionpicture/ttts-api-nodejs-client");
const express_1 = require("express");
const http_status_1 = require("http-status");
const moment = require("moment-timezone");
const authClient = new tttsapi.auth.ClientCredentials({
    domain: process.env.API_AUTHORIZE_SERVER_DOMAIN,
    clientId: process.env.API_CLIENT_ID,
    clientSecret: process.env.API_CLIENT_SECRET,
    scopes: [],
    state: ''
});
const apiRouter = express_1.Router();
apiRouter.get('/performances', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const now = moment();
        const performanceService = new tttsapi.service.Event({
            endpoint: process.env.API_ENDPOINT,
            auth: authClient
        });
        const searchResult = yield performanceService.searchPerformances(req.query);
        const performances = searchResult.data.data
            .filter((performance) => {
            // 時刻を見て無視 (一般: → 開始時刻)
            return now.isSameOrBefore(moment(performance.startDate));
        })
            .map((performance) => {
            var _a;
            const startTime = moment(performance.startDate)
                .tz('Asia/Tokyo')
                .format('HHmm');
            const endTime = moment(performance.endDate)
                .tz('Asia/Tokyo')
                .format('HHmm');
            return {
                id: performance.id,
                start_time: startTime,
                end_time: endTime,
                online_sales_status: (_a = performance.attributes) === null || _a === void 0 ? void 0 : _a.online_sales_status,
                seat_status: performance.remainingAttendeeCapacity,
                wheelchair_available: performance.remainingAttendeeCapacityForWheelchair // 車椅子残席数
            };
        });
        res.json(performances);
    }
    catch (error) {
        res.status(http_status_1.INTERNAL_SERVER_ERROR)
            .json({
            error: { message: error.message }
        });
    }
}));
exports.default = apiRouter;
