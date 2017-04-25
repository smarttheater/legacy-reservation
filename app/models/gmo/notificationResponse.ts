/**
 * GMOコンビニ決済結果通知に対する返却モデル(加盟店様⇒本サービス)
 *
 * @export
 * @class GMONotificationResponseModel
 */
// tslint:disable-next-line:no-stateless-class
export default class GMONotificationResponseModel {
    public static RECV_RES_OK: string = '0';
    public static RECV_RES_NG: string = '1';
}
