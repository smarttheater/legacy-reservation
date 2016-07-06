/**
 * GMO決済結果モデル
 */
export default class GMOResultModel {
    public ShopID: string;
    public JobCd: string;
    public Amount: string;
    public Tax: string;
    public Currency: string;
    public AccessID: string;
    public AccessPass: string;
    public OrderID: string;
    public Forwarded: string;
    public Method: string;
    public PayTimes: string;
    public Approve: string;
    public TranID: string;
    public TranDate: string;
    public CheckString: string;
    public ErrCode: string;
    public ErrInfo: string;
    public NewCardFlag: string;
    public PayType: string;
    public CvsCode: string;
    public CvsConfNo: string;
    public CvsReceiptNo: string;
    public CvsReceiptUrl: string;
    public EdyReceiptNo: string;
    public EdyOrderNo: string;
    public SuicaReceiptNo: string;
    public SuicaOrderNo: string;
    public BkCode: string;
    public ConfNo: string;
    public PaymentTerm: string;
    public CustID: string;
    public EncryptReceiptNo: string;
    public AuPayInfoNo: string;
    public AuPayMethod: string;
    public AuCancelAmount: string;
    public AuCancelTax: string;
    public DocomoSettlementCode: string;
    public DocomoCancelAmount: string;
    public DocomoCancelTax: string;
    public SbTrackingId: string;
    public SbCancelAmount: string;
    public SbCancelTax: string;
    public JibunReceiptNo: string;
    public PayDescription: string;
    public CardNo: string;
    public BeforeBalance: string;
    public AfterBalance: string;
    public CardActivateStatus: string;
    public CardTermStatus: string;
    public CardInvalidStatus: string;
    public CardWebInquiryStatus: string;
    public CardValidLimit: string;
    public CardTypeCode: string;
    public CarryInfo: string;
    public RequestNo: string;
    public AccountNo: string;
    public NetCashPayType: string;
    public RakutenIdItemId: string;
    public RakutenIdItemSubId: string;
    public RakutenIdItemName: string;
    public LinepayTranId: string;
    public LinepayPayMethod: string; // ???
    public RecruitItemName: string;
    public RcOrderId: string;
    public RcOrderTime: string;
    public RcUsePoint: string;
    public RcUseCoupon: string;
    public RcUseShopCoupon: string;
    public VaBankCode: string;
    public VaBankName: string;
    public VaBranchCode: string;
    public VaBranchName: string;
    public VaAccountType: string;
    public VaAccountNumber: string;
    public VaAvailableDate: string;
    public VaTradeCode: string;
    public ClientField1: string;
    public ClientField2: string;
    public ClientField3: string;

    public static parse(postParameters: Object): GMOResultModel {
        let model = new GMOResultModel();

        for (let propertyName in postParameters) {
            model[propertyName] = postParameters[propertyName];
        }

        return model;
    }
}
