import Util from '../../../common/Util/Util';
import ReservationUtil from '../../../common/models/Reservation/ReservationUtil';
import mvtkService = require('@motionpicture/mvtk-service');
import GMOUtil from '../../../common/Util/GMO/GMOUtil';

/**
 * 予約情報モデル
 * 
 * 予約プロセス中の情報を全て管理するためのモデルです
 * この情報をセッションで引き継くことで、予約プロセスを管理しています
 */
export default class ReservationModel {
    /** 予約トークン */
    public token: string;

    /** 購入管理番号 */
    public paymentNo: string;

    /** パフォーマンス */
    public performance: {
        _id: string,
        day: string,
        start_time: string,
        end_time: string,
        is_mx4d: boolean, // MX4D上映かどうか
        theater: {
            _id: string,
            name: string,
            name_en: string,
        },
        screen: {
            _id: string,
            name: string,
            name_en: string,
            sections: Array<{
                seats: Array<{
                    code: string, // 座席コード
                    grade: {
                        name: string, // 座席レベル名
                        name_en: string, // 座席レベル名(英語)
                        additional_charge: number // 追加料金
                    }
                }>
            }>
        },
        film: {
            _id: string,
            name: string,
            name_en: string,
            image: string
        },
    };

    /** 券種リスト */
    public ticketTypes: Array<{
        code: string,
        name: string, // 券種名
        name_en: string, // 券種名(英語)
        charge: number, // 料金
        is_on_the_day: boolean // 当日だけフラグ
    }>;

    /** スクリーンの座席表HTML */
    public screenHtml: string;

    /** 予約座席コードリスト */
    public seatCodes: Array<string>;

    /** プロフィール */
    public profile: {
        last_name: string,
        first_name: string,
        email: string,
        tel: string,
    };

    /** 決済方法 */
    public paymentMethod: string;

    /** 購入者区分 */
    public purchaserGroup: string;

    /**
     * プロセス中の購入情報をセッションに保存する
     * 
     * @param {number} ttl 有効期間(default: 3600)
     */
    public save(cb: (err: Error) => void, ttl?: number) {
        let client = Util.getRedisClient();
        let key = ReservationModel.getRedisKey(this.token);
        let _ttl = (ttl) ? ttl : 3600;
        client.setex(key, _ttl, JSON.stringify(this), (err, reply) => {
            client.quit();
            cb(err);
        });
    }

    /**
     * プロセス中の購入情報をセッションから削除する
     */
    public remove(cb: (err: Error) => void) {
        let client = Util.getRedisClient();
        let key = ReservationModel.getRedisKey(this.token);
        client.del(key, (err, reply) => {
            client.quit();
            cb(err);
        });
    }

    /**
     * プロセス中の購入情報をセッションから取得する
     */
    public static find(token: string, cb: (err: Error, reservationModel: ReservationModel) => void): void {
        let client = Util.getRedisClient();
        let key = ReservationModel.getRedisKey(token);
        client.get(key, (err, reply: Buffer) => {
            client.quit();
            if (err) {
                cb(err, null);
            } else {
                if (reply === null) {
                    cb(new Error('Not Found'), null);

                } else {
                    let reservationModel = new ReservationModel();
                    let reservationModelInRedis = JSON.parse(reply.toString('utf-8'));
                    for (let propertyName in reservationModelInRedis) {
                        reservationModel[propertyName] = reservationModelInRedis[propertyName];
                    }

                    cb(err, reservationModel);
                }
            }
        });
    }

    /**
     * ネームスペースを取得
     *
     * @param {string} token
     * @return {string}
     */
    private static getRedisKey(token): string {
        return `TIFFReservation_${token}`;
    }

    /**
     * 合計金額を算出する
     */
    public getTotalCharge(): number {
        let total = 0;

        if (Array.isArray(this.seatCodes) && this.seatCodes.length > 0) {
            this.seatCodes.forEach((seatCode) => {
                total += this.getChargeBySeatCode(seatCode);
            });
        }

        return total;
    }

    /**
     * 座席単体の料金を算出する
     */
    public getChargeBySeatCode(seatCode: string): number {
        let charge = 0;

        let reservation = this.getReservation(seatCode);
        if (reservation.ticket_type_charge) {
            charge += reservation.ticket_type_charge;
            charge += this.getChargeExceptTicketTypeBySeatCode(seatCode);
        }

        return charge;
    }

    public getChargeExceptTicketTypeBySeatCode(seatCode: string): number {
        let charge = 0;

        if (this.purchaserGroup === ReservationUtil.PURCHASER_GROUP_CUSTOMER
         || this.purchaserGroup === ReservationUtil.PURCHASER_GROUP_WINDOW
         || this.purchaserGroup === ReservationUtil.PURCHASER_GROUP_TEL
        ) {
            let reservation = this.getReservation(seatCode);

            // 座席グレード分加算
            if (reservation.seat_grade_additional_charge > 0) {
                charge += reservation.seat_grade_additional_charge;
            }

            // MX4D分加算
            if (this.performance.is_mx4d) {
                charge += ReservationUtil.CHARGE_MX4D;
            }

            // コンビニ手数料加算
            if (this.paymentMethod === GMOUtil.PAY_TYPE_CVS) {
                charge += ReservationUtil.CHARGE_CVS;
            }
        }

        return charge;
    }

    /**
     * 座席コードから予約情報を取得する
     */
    public getReservation(seatCode: string): Reservation {
        return (this[`reservation_${seatCode}`]) ? this[`reservation_${seatCode}`] : null;
    }

    /**
     * 座席コードの予約情報をセットする
     */
    public setReservation(seatCode: string, reservation: Reservation): void {
        this[`reservation_${seatCode}`] = reservation;
    }

    /**
     * 予約ドキュメントへ変換
     */
    public toReservationDocuments(): Array<Object> {
        let documents: Array<Object> = [];
        let totalCharge = this.getTotalCharge();


        this.seatCodes.forEach((seatCode) => {
            let reservation = this.getReservation(seatCode);

            documents.push(
                {
                    // TODO 金額系の税込みと消費税と両方

                    _id: reservation._id,

                    seat_code: seatCode,
                    seat_grade_name: reservation.seat_grade_name,
                    seat_grade_name_en: reservation.seat_grade_name_en,
                    seat_grade_additional_charge: reservation.seat_grade_additional_charge,

                    total_charge: totalCharge,
                    charge: this.getChargeBySeatCode(seatCode),
                    payment_no: this.paymentNo,
                    purchaser_group: this.purchaserGroup,

                    performance: this.performance._id,
                    performance_day: this.performance.day,
                    performance_start_time: this.performance.start_time,
                    performance_end_time: this.performance.end_time,
                    performance_is_mx4d: this.performance.is_mx4d,

                    theater: this.performance.theater._id,
                    theater_name: this.performance.theater.name,
                    theater_name_en: this.performance.theater.name_en,

                    screen: this.performance.screen._id,
                    screen_name: this.performance.screen.name,
                    screen_name_en: this.performance.screen.name_en,

                    film: this.performance.film._id,
                    film_name: this.performance.film.name,
                    film_name_en: this.performance.film.name_en,

                    purchaser_last_name: (this.profile) ? this.profile.last_name : null,
                    purchaser_first_name: (this.profile) ? this.profile.first_name : null,
                    purchaser_email: (this.profile) ? this.profile.email : null,
                    purchaser_tel: (this.profile) ? this.profile.tel : null,

                    payment_method: (this.paymentMethod) ? this.paymentMethod : null,

                    ticket_type_code: reservation.ticket_type_code,
                    ticket_type_name: reservation.ticket_type_name,
                    ticket_type_name_en: reservation.ticket_type_name_en,
                    ticket_type_charge: reservation.ticket_type_charge,

                    watcher_name: reservation.watcher_name,
                    watcher_name_updated_at: Date.now(),

                    // member: (this.member) ? this.member._id : null,
                    // member_user_id: (this.member) ? this.member.user_id : null,

                    updated_user: 'ReservationModel'
                }
            );
        });

        return documents;
    }

    /**
     * ログ用の形式にする
     */
    public toLog(): Object {
        let log = {
            token: this.token,
            paymentNo: this.paymentNo,
            performance: this.performance,
            seatCodes: this.seatCodes,
            profile: this.profile,
            paymentMethod: this.paymentMethod,
            purchaserGroup: this.purchaserGroup
        };

        return log;
    }
}

interface Reservation {
    _id: string;
    status: string;
    seat_code: string,
    seat_grade_name: string,
    seat_grade_name_en: string,
    seat_grade_additional_charge: number,

    ticket_type_code?: string,
    ticket_type_name?: string,
    ticket_type_name_en?: string,
    ticket_type_charge?: number,

    watcher_name?: string,
}