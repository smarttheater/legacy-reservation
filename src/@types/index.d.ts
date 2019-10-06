import * as tttsapi from '@motionpicture/ttts-api-nodejs-client';
import * as express from 'express';

declare global {
    namespace Express {
        /**
         * 取引カテゴリー
         * 車椅子 or 一般
         */
        type ITransactionCategory = 'wheelchair' | 'general';

        /**
         * 進行中の仮予約インターフェース
         */
        interface ITmpReservation {
            reservedTicket: {
                /**
                 * 券種
                 */
                ticketType: tttsapi.factory.chevre.ticketType.ITicketType;
            };
            /**
             * 単価
             */
            unitPrice: number;
        }

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
            seller: tttsapi.factory.seller.IOrganization<tttsapi.factory.seller.IAttributes<tttsapi.factory.organizationType.Corporation>>;
            /**
             * 販売者ID
             */
            sellerId: string;
            seatReservationAuthorizeActionId?: string;
            creditCardAuthorizeActionId?: string;
            /**
             * 予約対象カテゴリ
             */
            category: ITransactionCategory;
            /**
             * 購入管理番号
             */
            paymentNo?: string;
            /**
             * 座席仮予約有効期限ISO8601フォーマット
             */
            expires: string;
            /**
             * パフォーマンス
             */
            performance?: tttsapi.factory.performance.IPerformanceWithDetails;
            /**
             * 決済方法選択肢
             */
            paymentMethodChoices: string[];
            /**
             * 券種リスト
             */
            ticketTypes: ITicketType[];
            /**
             * 予約座席コードリスト
             */
            purchaser: IPurchaser;
            /**
             * 決済方法
             */
            paymentMethod: tttsapi.factory.paymentMethodType;
            /**
             * 購入者区分
             */
            purchaserGroup: string;
            /**
             * GMO取引
             */
            transactionGMO: ITransactionGMO;
            /**
             * 仮予約リスト
             */
            reservations: ITmpReservation[];
        }

        /**
         * チケット情報インターフェース
         */
        type ITicketType = tttsapi.factory.chevre.ticketType.ITicketType & {
            count: number;
        };

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
            amount: number;
            count: number;
        }

        // tslint:disable-next-line:interface-name
        export interface Session {
            /**
             * 購入者情報(一度入力するとセッションが保持)
             */
            purchaser?: IPurchaser;
            /**
             * 進行中の取引
             */
            transactionInProgress?: ITransactionInProgress;
            /**
             * 成立した取引結果
             */
            transactionResult?: tttsapi.factory.transaction.placeOrder.IResult;
            /**
             * 成立した取引の予約印刷トークン
             */
            printToken?: string;
        }
    }
}
