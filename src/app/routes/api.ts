/**
 * アプリ内APIルーティング
 */
import * as cinerinoapi from '@cinerino/sdk';
// import * as tttsapi from '@motionpicture/ttts-api-nodejs-client';
import { Router } from 'express';
import { INTERNAL_SERVER_ERROR } from 'http-status';
import * as moment from 'moment-timezone';

const authClient = new cinerinoapi.auth.ClientCredentials({
    domain: <string>process.env.API_AUTHORIZE_SERVER_DOMAIN,
    clientId: <string>process.env.API_CLIENT_ID,
    clientSecret: <string>process.env.API_CLIENT_SECRET,
    scopes: [],
    state: ''
});

const eventService = new cinerinoapi.service.Event({
    endpoint: <string>process.env.CINERINO_API_ENDPOINT,
    auth: authClient
});

interface ISearchPerformancesResult {
    id: string;
    start_time: string;
    end_time: string;
    online_sales_status: string;
    seat_status?: number;
    wheelchair_available?: number;
}

const apiRouter = Router();

apiRouter.get(
    '/events',
    async (req, res) => {
        try {
            const now = moment();

            // req.query↓
            // page: 1
            // day: 20200804
            const searchResult = await eventService.search({
                limit: 100,
                typeOf: cinerinoapi.factory.chevre.eventType.ScreeningEvent,
                ...(typeof req.query.day === 'string' && req.query.day.length > 0)
                    ? {
                        startFrom: moment(`${req.query.day}T00:00:00+09:00`, 'YYYYMMDDTHH:mm:ssZ')
                            .toDate(),
                        startThrough: moment(`${req.query.day}T23:59:59+09:00`, 'YYYYMMDDTHH:mm:ssZ')
                            .toDate()
                    }
                    : undefined,
                ...{
                    $projection: { aggregateReservation: 0 }
                }
            });

            const events: ISearchPerformancesResult[] = searchResult.data
                .filter((event) => {
                    // 時刻を見て無視 (一般: → 開始時刻)
                    return now.isSameOrBefore(moment(event.startDate));
                })
                .map((event) => {
                    const startTime = moment(event.startDate)
                        .tz('Asia/Tokyo')
                        .format('HHmm');
                    const endTime = moment(event.endDate)
                        .tz('Asia/Tokyo')
                        .format('HHmm');

                    let seatStatus: number | undefined;
                    let wheelchairAvailable: number | undefined;

                    // 一般座席の残席数
                    seatStatus = event.aggregateOffer?.offers?.find((o) => o.identifier === '001')?.remainingAttendeeCapacity;
                    // 車椅子座席の残席数
                    wheelchairAvailable = event.aggregateOffer?.offers?.find((o) => o.identifier === '004')?.remainingAttendeeCapacity;

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
        } catch (error) {
            res.status(INTERNAL_SERVER_ERROR)
                .json({
                    error: { message: error.message }
                });
        }
    }
);

// apiRouter.get(
//     '/performances',
//     async (req, res) => {
//         try {
//             const now = moment();

//             const performanceService = new tttsapi.service.Event({
//                 endpoint: <string>process.env.API_ENDPOINT,
//                 auth: authClient
//             });

//             const searchResult = await performanceService.searchPerformances(req.query);

//             const performances: ISearchPerformancesResult[] = searchResult.data.data
//                 .filter((performance) => {
//                     // 時刻を見て無視 (一般: → 開始時刻)
//                     return now.isSameOrBefore(moment(performance.startDate));
//                 })
//                 .map((performance) => {
//                     const startTime = moment(performance.startDate)
//                         .tz('Asia/Tokyo')
//                         .format('HHmm');
//                     const endTime = moment(performance.endDate)
//                         .tz('Asia/Tokyo')
//                         .format('HHmm');

//                     return {
//                         id: performance.id,
//                         start_time: startTime,
//                         end_time: endTime,
//                         online_sales_status: (<any>performance).attributes?.online_sales_status,
//                         seat_status: performance.remainingAttendeeCapacity, // 一般残席数
//                         wheelchair_available: performance.remainingAttendeeCapacityForWheelchair // 車椅子残席数
//                     };
//                 });

//             res.json(performances);
//         } catch (error) {
//             res.status(INTERNAL_SERVER_ERROR)
//                 .json({
//                     error: { message: error.message }
//                 });
//         }
//     }
// );

export default apiRouter;
