import { Request } from 'express';

/**
 * 予約セッション
 * 予約プロセス中の情報を全て管理するためのモデルです
 * この情報をセッションで引き継くことで、予約プロセスを管理しています
 */
export default class ReserveSessionModel {
    public transactionInProgress: Express.ITransactionInProgress;

    constructor(transactionInProgress: Express.ITransactionInProgress) {
        this.transactionInProgress = transactionInProgress;
    }

    /**
     * プロセス中の購入情報をセッションから取得する
     */
    public static FIND(req: Request): ReserveSessionModel | undefined {
        const transactionInProgress = (<Express.Session>req.session).transactionInProgress;
        if (transactionInProgress === undefined) {
            return;
        }

        return new ReserveSessionModel(transactionInProgress);
    }

    /**
     * プロセス中の購入情報をセッションから削除する
     */
    public static REMOVE(req: Request): void {
        delete (<Express.Session>req.session).transactionInProgress;
    }

    /**
     * プロセス中の購入情報をセッションに保存する
     */
    public save(req: Request): ReserveSessionModel {
        (<Express.Session>req.session).transactionInProgress = this.transactionInProgress;

        return this;
    }

    /**
     * 合計金額を算出する
     */
    public getTotalCharge(): number {
        let total = 0;

        if (Array.isArray(this.transactionInProgress.reservations)) {
            total = this.transactionInProgress.reservations.reduce(
                (a, b) => a + b.unitPrice,
                0
            );
        }

        return total;
    }
}
