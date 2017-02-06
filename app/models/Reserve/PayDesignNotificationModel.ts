/**
 * ペイデザイン結果通知モデル
 */
export default class PayDesignNotificationModel {
    /** 通知番号 */
    public SEQ: string;
    /** 入金日(yyymmdd) */
    public DATE: string;
    /** 入金時刻(hhmmdd) */
    public TIME: string;
    /** 取引コード */
    public SID: string;
    /** 金額 */
    public KINGAKU: string;
    /** 決済方法 */
    public CVS: string;
    /** 店コード */
    public SCODE: string;
    /** 付加情報 */
    public FUKA: string;

    public static parse(postParameters: Object): PayDesignNotificationModel {
        let model = new PayDesignNotificationModel();

        for (let propertyName in postParameters) {
            model[propertyName] = postParameters[propertyName];
        }

        return model;
    }
}
