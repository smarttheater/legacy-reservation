/**
 * ペイデザイン結果通知モデル
 *
 * @export
 * @class PayDesignNotificationModel
 */
export default class PayDesignNotificationModel {
    /**
     * 通知番号
     */
    public SEQ: string;
    /**
     * 入金日(yyymmdd)
     */
    public DATE: string;
    /**
     * 入金時刻(hhmmdd)
     */
    public TIME: string;
    /**
     * 取引コード
     */
    public SID: string;
    /**
     * 金額
     */
    public KINGAKU: string;
    /**
     * 決済方法
     */
    public CVS: string;
    /**
     * 店コード
     */
    public SCODE: string;
    /**
     * 付加情報
     */
    public FUKA: string;

    // tslint:disable-next-line:function-name
    public static parse(postParameters: any): PayDesignNotificationModel {
        const model = new PayDesignNotificationModel();
        Object.keys(postParameters).forEach((key) => {
            (<any>model)[key] = (<any>postParameters)[key];
        });

        return model;
    }
}
