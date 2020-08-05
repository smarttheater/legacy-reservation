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
const cinerinoapi = require("@cinerino/sdk");
const tttsapi = require("@motionpicture/ttts-api-nodejs-client");
const express_1 = require("express");
const http_status_1 = require("http-status");
const moment = require("moment-timezone");
const authClient = new cinerinoapi.auth.ClientCredentials({
    domain: process.env.API_AUTHORIZE_SERVER_DOMAIN,
    clientId: process.env.API_CLIENT_ID,
    clientSecret: process.env.API_CLIENT_SECRET,
    scopes: [],
    state: ''
});
const eventService = new cinerinoapi.service.Event({
    endpoint: process.env.CINERINO_API_ENDPOINT,
    auth: authClient
});
const apiRouter = express_1.Router();
apiRouter.get('/events', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const now = moment();
        // req.query↓
        // page: 1
        // day: 20200804
        const searchResult = yield eventService.search(Object.assign(Object.assign({ limit: 100, typeOf: cinerinoapi.factory.chevre.eventType.ScreeningEvent }, (typeof req.query.day === 'string' && req.query.day.length > 0)
            ? {
                startFrom: moment(`${req.query.day}T00:00:00+09:00`, 'YYYYMMDDTHH:mm:ssZ')
                    .toDate(),
                startThrough: moment(`${req.query.day}T23:59:59+09:00`, 'YYYYMMDDTHH:mm:ssZ')
                    .toDate()
            }
            : undefined), {
            $projection: { aggregateReservation: 0 }
        }));
        const events = searchResult.data
            .filter((event) => {
            // 時刻を見て無視 (一般: → 開始時刻)
            return now.isSameOrBefore(moment(event.startDate));
        })
            .map((event) => {
            var _a, _b, _c, _d, _e, _f;
            const startTime = moment(event.startDate)
                .tz('Asia/Tokyo')
                .format('HHmm');
            const endTime = moment(event.endDate)
                .tz('Asia/Tokyo')
                .format('HHmm');
            let seatStatus;
            let wheelchairAvailable;
            // 一般座席の残席数
            seatStatus = (_c = (_b = (_a = event.aggregateOffer) === null || _a === void 0 ? void 0 : _a.offers) === null || _b === void 0 ? void 0 : _b.find((o) => o.identifier === '001')) === null || _c === void 0 ? void 0 : _c.remainingAttendeeCapacity;
            // 車椅子座席の残席数
            wheelchairAvailable = (_f = (_e = (_d = event.aggregateOffer) === null || _d === void 0 ? void 0 : _d.offers) === null || _e === void 0 ? void 0 : _e.find((o) => o.identifier === '004')) === null || _f === void 0 ? void 0 : _f.remainingAttendeeCapacity;
            return {
                id: event.id,
                start_time: startTime,
                end_time: endTime,
                online_sales_status: (event.eventStatus === cinerinoapi.factory.chevre.eventStatusType.EventScheduled)
                    ? 'Normal'
                    : 'Suspended',
                seat_status: seatStatus,
                wheelchair_available: wheelchairAvailable
            };
        });
        res.json(events);
    }
    catch (error) {
        res.status(http_status_1.INTERNAL_SERVER_ERROR)
            .json({
            error: { message: error.message }
        });
    }
}));
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
