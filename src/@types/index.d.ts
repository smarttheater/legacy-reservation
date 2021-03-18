import * as cinerinoapi from '@cinerino/sdk';

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
                ticketType: cinerinoapi.factory.chevre.offer.IOffer;
            };
            /**
             * 単価
             */
            unitPrice: number;
        }

        type IAuthorizeSeatReservationResult =
            cinerinoapi.factory.action.authorize.offer.seatReservation.IResult<cinerinoapi.factory.service.webAPI.Identifier.Chevre>;

        interface ITransactionInProgress {
            /**
             * 取引ID
             */
            id: string;
            expires: string;
            agent?: cinerinoapi.factory.transaction.placeOrder.IAgent;
            seller: cinerinoapi.factory.seller.ISeller;
            seatReservationAuthorizeActionId?: string;
            /**
             * 座席予約承認結果
             */
            authorizeSeatReservationResult?: IAuthorizeSeatReservationResult;
            creditCardAuthorizeActionId?: string;
            /**
             * 予約対象カテゴリ
             */
            category: ITransactionCategory;
            /**
             * パフォーマンス
             */
            performance?: cinerinoapi.factory.event.IEvent<cinerinoapi.factory.chevre.eventType.ScreeningEvent>;
            /**
             * 券種リスト
             */
            ticketTypes: ITicketType[];
            purchaser: IPurchaser;
            profile?: cinerinoapi.factory.person.IProfile;
            /**
             * 仮予約リスト
             */
            reservations: ITmpReservation[];
        }

        /**
         * チケット情報インターフェース
         */
        type ITicketType = cinerinoapi.factory.chevre.event.screeningEvent.ITicketOffer & {
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
            transactionResult?: cinerinoapi.factory.transaction.placeOrder.IResult & {
                code?: string;
            };
            /**
             * チケット照会結果
             */
            inquiryResult?: {
                code?: string;
                order: cinerinoapi.factory.order.IOrder;
            };
            /**
             * 印刷結果
             */
            printResult?: {
                order?: cinerinoapi.factory.order.IOrder;
                reservations: cinerinoapi.factory.order.IReservation[];
            };
        }
    }
}
