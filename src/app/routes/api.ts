/**
 * アプリ内APIルーティング
 */
import * as tttsapi from '@motionpicture/ttts-api-nodejs-client';
import { Router } from 'express';
import { INTERNAL_SERVER_ERROR } from 'http-status';
import * as moment from 'moment-timezone';

const authClient = new tttsapi.auth.ClientCredentials({
    domain: <string>process.env.API_AUTHORIZE_SERVER_DOMAIN,
    clientId: <string>process.env.API_CLIENT_ID,
    clientSecret: <string>process.env.API_CLIENT_SECRET,
    scopes: [],
    state: ''
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
    '/performances',
    async (req, res) => {
        try {
            const now = moment();

            const performanceService = new tttsapi.service.Event({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: authClient
            });

            const searchResult = await performanceService.searchPerformances(req.query);

            const performances: ISearchPerformancesResult[] = searchResult.data.data
                .filter((performance) => {
                    // 時刻を見て無視 (一般: → 開始時刻)
                    return now.isSameOrBefore(moment(performance.startDate));
                })
                .map((performance) => {
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
                        online_sales_status: (<any>performance).attributes?.online_sales_status,
                        seat_status: performance.remainingAttendeeCapacity, // 一般残席数
                        wheelchair_available: performance.remainingAttendeeCapacityForWheelchair // 車椅子残席数
                    };
                });

            res.json(performances);
        } catch (error) {
            res.status(INTERNAL_SERVER_ERROR)
                .json({
                    error: { message: error.message }
                });
        }
    });

export default apiRouter;
