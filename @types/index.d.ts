import * as ttts from '@motionpicture/ttts-domain';
import * as express from 'express';

declare global {
    namespace Express {
        interface ITransactionInProgress {
            /**
             * 取引ID(MongoDBで発行される)
             */
            id: string;
            /**
             * 取引主体ID
             */
            agentId: string;
            /**
             * 販売者ID
             */
            seller: ttts.factory.organization.corporation.IOrganization;
            /**
             * 販売者ID
             */
            sellerId: string;
            seatReservationAuthorizeActionId: string;
            creditCardAuthorizeActionId: string;
            /**
             * 予約対象カテゴリ("0":一般,"1":車椅子)
             */
            category: string;
            /**
             * 購入管理番号
             */
            paymentNo: string;
            /**
             * 座席仮予約有効期限ISO8601フォーマット
             */
            expires: string;
            /**
             * パフォーマンス
             */
            performance: IPerformance;
            /**
             * 決済方法選択肢
             */
            paymentMethodChoices: string[];
            /**
             * 券種リスト
             */
            ticketTypes: ITicketType[];
            /**
             * スクリーン内の座席グレードリスト
             */
            seatGradeCodesInScreen: string[];
            /**
             * スクリーンの座席表HTML
             */
            screenHtml: string;
            /**
             * 予約座席コードリスト
             */
            purchaser: IPurchaser;
            /**
             * 決済方法
             */
            paymentMethod: ttts.factory.paymentMethodType;
            /**
             * 購入者区分
             */
            purchaserGroup: string;
            /**
             * GMO取引
             */
            transactionGMO: ITransactionGMO;
            reservationsBySeatCode: {
                [seatCode: string]: IReservation;
            };
            reservations: IReservation[];
        }

        /**
         * パフォーマンス情報インターフェース
         */
        type IPerformance = ttts.factory.performance.IPerformanceWithDetails;

        /**
         * チケット情報インターフェース
         */
        type ITicketType = ttts.factory.offer.seatReservation.ITicketType & {
            count: number;
        };

        /**
         * 予約情報インターフェース
         */
        type IReservation = ttts.factory.action.authorize.seatReservation.ITmpReservation;

        /**
         * 購入者情報インターフェース
         */
        interface IPurchaser {
            lastName: string;
            firstName: string;
            tel: string;
            email: string;
            age: string;
            address: string;
            gender: string;
        }

        interface ITransactionGMO {
            orderId: string;
            amount: number;
            count: number;
            status: string;
        }

        // tslint:disable-next-line:interface-name
        export interface Session {
            purchaser?: IPurchaser;
            transactionInProgress?: ITransactionInProgress;
            transactionResult?: ttts.factory.transaction.placeOrder.IResult;
            printToken?: string;
        }
    }
}
