/**
 * 予約フローベースコントローラーインターフェース
 */
interface ReserveControllerInterface {
    /**
     * 購入者区分
     */
    purchaserGroup: string;
    /**
     * 購入プロセス開始
     */
    start(): void;
    /**
     * 規約
     */
    terms(): void;
    /**
     * スケジュール選択
     */
    performances(): void;
    /**
     * 座席選択
     */
    seats(): void;
    /**
     * 券種選択
     */
    tickets(): void;
    /**
     * 購入者情報入力
     */
    profile(): void;
    /**
     * 購入情報確認
     */
    confirm(): void;
    /**
     * 購入完了
     */
    complete(): void;
}

export default ReserveControllerInterface;
