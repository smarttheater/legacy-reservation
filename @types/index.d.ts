import * as ttts from '@motionpicture/ttts-domain';
import * as express from 'express';

declare global {
    namespace Express {
        // tslint:disable-next-line:interface-name
        export interface Session {
            transactionResult?: ttts.factory.transaction.placeOrder.IResult;
            printToken?: string;
        }
    }
}
