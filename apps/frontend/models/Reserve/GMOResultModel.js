"use strict";
/**
 * GMO決済結果モデル
 */
class GMOResultModel {
    // /** Edy 受付番号 */
    // public EdyReceiptNo: string;
    // /** Edy 注文番号 */
    // public EdyOrderNo: string;
    // /** Suica 注文番号 */
    // public SuicaReceiptNo: string;
    // /** Suica 受付番号 */
    // public SuicaOrderNo: string;
    // /**  */
    // public BkCode: string;
    // /**  */
    // public ConfNo: string;
    // /**  */
    // public PaymentTerm: string;
    // /**  */
    // public CustID: string;
    // /**  */
    // public EncryptReceiptNo: string;
    // /**  */
    // public AuPayInfoNo: string;
    // /**  */
    // public AuPayMethod: string;
    // /**  */
    // public AuCancelAmount: string;
    // /**  */
    // public AuCancelTax: string;
    // /**  */
    // public DocomoSettlementCode: string;
    // /**  */
    // public DocomoCancelAmount: string;
    // /**  */
    // public DocomoCancelTax: string;
    // /**  */
    // public SbTrackingId: string;
    // /**  */
    // public SbCancelAmount: string;
    // /**  */
    // public SbCancelTax: string;
    // /**  */
    // public JibunReceiptNo: string;
    // /**  */
    // public PayDescription: string;
    // /**  */
    // public CardNo: string;
    // /**  */
    // public BeforeBalance: string;
    // /**  */
    // public AfterBalance: string;
    // /**  */
    // public CardActivateStatus: string;
    // /**  */
    // public CardTermStatus: string;
    // /**  */
    // public CardInvalidStatus: string;
    // /**  */
    // public CardWebInquiryStatus: string;
    // /**  */
    // public CardValidLimit: string;
    // /**  */
    // public CardTypeCode: string;
    // /**  */
    // public CarryInfo: string;
    // /**  */
    // public RequestNo: string;
    // /**  */
    // public AccountNo: string;
    // /**  */
    // public NetCashPayType: string;
    // /**  */
    // public RakutenIdItemId: string;
    // /**  */
    // public RakutenIdItemSubId: string;
    // /**  */
    // public RakutenIdItemName: string;
    // /**  */
    // public LinepayTranId: string;
    // /**  */
    // public LinepayPayMethod: string; // ???
    // /**  */
    // public RecruitItemName: string;
    // /**  */
    // public RcOrderId: string;
    // /**  */
    // public RcOrderTime: string;
    // /**  */
    // public RcUsePoint: string;
    // /**  */
    // public RcUseCoupon: string;
    // /**  */
    // public RcUseShopCoupon: string;
    // /**  */
    // public VaBankCode: string;
    // /**  */
    // public VaBankName: string;
    // /**  */
    // public VaBranchCode: string;
    // /**  */
    // public VaBranchName: string;
    // /**  */
    // public VaAccountType: string;
    // /**  */
    // public VaAccountNumber: string;
    // /**  */
    // public VaAvailableDate: string;
    // /**  */
    // public VaTradeCode: string;
    static parse(postParameters) {
        let model = new GMOResultModel();
        for (let propertyName in postParameters) {
            model[propertyName] = postParameters[propertyName];
        }
        return model;
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = GMOResultModel;
