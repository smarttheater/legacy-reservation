// tslint:disable:variable-name
/**
 * GMOコンビニ決済結果通知モデル
 *
 * @export
 * @class GMONotificationModel
 */
export default class GMONotificationModel {
    /**
     * ショップID 13
     */
    public ShopID: string;
    /**
     * ショップパスワード “*” 10 桁固定
     */
    public ShopPass: string;
    /**
     * 取引ID 32
     * ※：同一オーダーID でも決済手段が異なると、異なった「取引ID」および「取引パスワード」が返却されます。
     */
    public AccessID: string;
    /**
     * 取引パスワード “*” 32 桁固定
     */
    public AccessPass: string;
    /**
     * オーダーID 27
     */
    public OrderID: string;

    /**
     * 現状態 11
     *
     * コンビニ決済の場合
     * UNPROCESSED：未決済
     * REQSUCCESS：要求成功
     * PAYSUCCESS：決済完了
     * PAYFAIL：決済失敗
     * EXPIRED：期限切れ
     * CANCEL：支払い停止
     *
     * クレジットカード決済の場合
     * UNPROCESSED：未決済
     * AUTHENTICATED：未決済(3D 登録済)
     * CHECK：有効性チェック
     * CAPTURE：即時売上
     * AUTH：仮売上
     * SALES：実売上
     * VOID：取消
     * RETURN：返品
     * RETURNX：月跨り返品
     * SAUTH：簡易オーソリ
     */
    public Status: string;

    /**
     * 処理区分 7
     *
     * CHECK：有効性チェック
     * CAPTURE：即時売上
     * AUTH：仮売上
     * SALES：実売上
     * VOID：取消
     * RETURN：返品
     * RETURNX：月跨り返品
     * SAUTH：簡易オーソリ
     */
    public JobCd: string;

    /**
     * 利用金額 10 決済または決済依頼をした金額を返却します。
     */
    public Amount: string;
    /**
     * 税送料 10
     */
    public Tax: string;
    /**
     * 通貨コード 3 決済に利用された通貨を返却します。
     */
    public Currency: string;

    /**
     * 仕向先会社コード 7
     */
    public Forward: string;

    /**
     * 支払方法 1
     * 以下のいずれかが返却されます。
     * 1：一括
     * 2：分割
     * 3：ボーナス一括
     * 4：ボーナス分割
     * 5：リボ
     */
    public Method: string;

    /**
     * 支払回数 2
     */
    public PayTimes: string;

    /**
     * トランザクションID 28
     * カード・コンビニ・Pay-easy・PayPal・iD ネット決済時のみ返却
     */
    public TranID: string;

    /**
     * 承認番号
     */
    public Approve: string;

    /**
     * 処理日付 14 yyyyMMddHHmmss 書式
     */
    public TranDate: string;
    /**
     * 支払先コンビニコード 5 支払先コンビニ会社コード
     */
    public CvsCode: string;
    /**
     * 確認番号 20 コンビニ確認番号
     */
    public CvsConfNo: string;
    /**
     * 受付番号 32 支払先コンビニが返却した受付番号
     */
    public CvsReceiptNo: string;
    /**
     * 支払期限日時 14 yyyyMMddHHmmss 書式
     */
    public PaymentTerm: string;
    /**
     * 入金確定日時 14
     * yyyyMMddHHmmss 書式
     * 入金が確定した日時
     */
    public FinishDate: string;
    /**
     * 受付日時 14
     * yyyyMMddHHmmss 書式
     * 後続センターが受付した日時
     */
    public ReceiptDate: string;
    /**
     * エラーコード 3 エラー発生時のみ ※2
     */
    public ErrCode: string;
    /**
     * エラー詳細コード 9 エラー発生時のみ ※2
     */
    public ErrInfo: string;
    /**
     * 決済方法 1 3：コンビニ
     */
    public PayType: string;

    // tslint:disable-next-line:function-name
    public static parse(postParameters: any): GMONotificationModel {
        const model = new GMONotificationModel();
        Object.keys(postParameters).forEach((key) => {
            (<any>model)[key] = (<any>postParameters)[key];
        });

        return model;
    }
}
