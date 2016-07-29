import ReservationResultModel from './ReservationResultModel';
import Util from '../../../common/Util/Util';
import ReservationUtil from '../../../common/models/Reservation/ReservationUtil';

/**
 * 予約情報モデル
 * 
 * 予約プロセス中の情報を全て管理するためのモデルです
 * この情報をセッションで引き継くことで、予約プロセスを管理しています
 */
export default class ReservationModel {
    /**
     * 予約トークン
     */
    public token: string;

    /**
     * 購入管理番号
     */
    public paymentNo: string;

    /**
     * パフォーマンス
     */
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
                        additional_charge: Number // 追加料金
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

    /**
     * 券種リスト
     */
    public ticketTypes: Array<
         {
            code: string,
            name: string, // 券種名
            name_en: string, // 券種名(英語)
            charge: number, // 料金
            is_on_the_day: boolean // 当日だけフラグ
        }
    >;

    /**
     * スクリーンの座席表HTML
     */
    public screenHtml: string;

    /**
     * 予約IDリスト
     */
    public reservationIds: Array<string>;

    /**
     * プロフィール
     */
    public profile: {
        last_name: string,
        first_name: string,
        email: string,
        tel: string,
    };

    /**
     * 決済方法
     */
    public paymentMethod: string;

    /**
     * メルマガ当選者
     */
    public member: {
        _id: string;
        user_id: string;
    };

    /**
     * 内部関係者
     */
    public staff: {
        _id: string;
        user_id: string;
        name: string;
        email: string;
        department_name: string;
        tel: string;
        signature: string;
    };

    /**
     * 外部関係者
     */
    public sponsor: {
        _id: string;
        user_id: string;
        name: string;
        email: string;
    };

    public reservedDocuments: Array<any>;

    /**
     * プロセス中の購入情報をセッションに保存する
     * 
     * @param {number} ttl 有効期間(default: 3600)
     */
    public save(cb: (err: Error) => any, ttl?: number) {
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
    public remove(cb: (err: Error) => any) {
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
    public static find(token: string, cb: (err: Error, reservationModel: ReservationModel) => any): void {
        let client = Util.getRedisClient();
        let key = ReservationModel.getRedisKey(token);
        client.get(key, (err, reply: Buffer) => {
            client.quit();
            if (err) {
                cb(err, null);
            } else {
                if (reply === null) {
                    cb(err, null);

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
    public getTotalPrice(): number {
        let total = 0;

        if (Array.isArray(this.reservationIds) && this.reservationIds.length > 0) {
            this.reservationIds.forEach((reservationId, index) => {
                let reservation = this.getReservation(reservationId);
                if (reservation.ticket_type_charge) {
                    total += reservation.ticket_type_charge;

                    // 座席グレード分加算
                    if (reservation.seat_grade_additional_charge > 0) {
                        total += reservation.seat_grade_additional_charge;
                    }

                    // MX4D分加算
                    if (this.performance.is_mx4d) {
                        total += 200;
                    }
                }
            });
        }

        return total;
    }

    /**
     * 仮予約中の座席コードリストを取得する
     */
    public getSeatCodes(): Array<string> {
        let seatcodes = [];

        if (Array.isArray(this.reservationIds) && this.reservationIds.length > 0) {
            this.reservationIds.forEach((reservationId, index) => {
                let reservation = this.getReservation(reservationId);
                seatcodes.push(reservation.seat_code);
            });
        }

        return seatcodes;
    }

    public getReservation(id: string): Reservation {
        return (this[`reservation_${id}`]) ? this[`reservation_${id}`] : null;
    }

    public setReservation(id: string, reservation: Reservation): void {
        this[`reservation_${id}`] = reservation;
    }

    /**
     * 予約ドキュメントへ変換
     */
    public toReservationDocuments(): Array<Object> {
        let documents: Array<Object> = [];

        this.reservationIds.forEach((reservationId, index) => {
            let reservation = this.getReservation(reservationId);

            documents.push(
                {
                    payment_no: this.paymentNo,
                    status: ReservationUtil.STATUS_RESERVED,
                    performance: this.performance._id,
                    performance_day: this.performance.day,
                    performance_start_time: this.performance.start_time,
                    performance_end_time: this.performance.end_time,
                    theater: this.performance.theater._id,
                    theater_name: this.performance.theater.name,
                    screen: this.performance.screen._id,
                    screen_name: this.performance.screen.name,
                    film: this.performance.film._id,
                    film_name: this.performance.film.name,
                    purchaser_last_name: this.profile.last_name,
                    purchaser_first_name: this.profile.first_name,
                    purchaser_email: this.profile.email,
                    purchaser_tel: this.profile.tel,
                    ticket_type_code: reservation.ticket_type_code,
                    ticket_type_name: reservation.ticket_type_name,
                    ticket_type_name_en: reservation.ticket_type_name_en,
                    ticket_type_charge: reservation.ticket_type_charge,

                    watcher_name: reservation.watcher_name,

                    member: (this.member) ? this.member._id : null,
                    member_user_id: (this.member) ? this.member.user_id : null,

                    sponsor: (this.sponsor) ? this.sponsor._id : null,
                    sponsor_user_id: (this.sponsor) ? this.sponsor.user_id : null,
                    sponsor_name: (this.sponsor) ? this.sponsor.name : null,
                    sponsor_email: (this.sponsor) ? this.sponsor.email : null,

                    staff: (this.staff) ? this.staff._id : null,
                    staff_user_id: (this.staff) ? this.staff.user_id : null,
                    staff_name: (this.staff) ? this.staff.name : null,
                    staff_email: (this.staff) ? this.staff.email : null,
                    staff_department_name: (this.staff) ? this.staff.department_name : null,
                    staff_tel: (this.staff) ? this.staff.tel : null,
                    staff_signature: (this.staff) ? this.staff.signature : null,

                    created_user: this.constructor.toString(),
                    updated_user: this.constructor.toString(),
                }
            );
        });

        return documents;
    }

    /**
     * 予約結果モデルへ変換
     */
    public toReservationResult(): ReservationResultModel {
        let reservationResultModel = new ReservationResultModel();

        reservationResultModel.token = this.token;
        reservationResultModel.paymentNo = this.paymentNo;
        reservationResultModel.performance = this.performance;
        reservationResultModel.reservations = [];
        reservationResultModel.profile = this.profile;
        reservationResultModel.paymentMethod = this.paymentMethod;
        reservationResultModel.member = this.member;
        reservationResultModel.staff = this.staff;
        reservationResultModel.sponsor = this.sponsor;
        reservationResultModel.reservedDocuments = this.reservedDocuments;

        this.reservationIds.forEach((reservationId, index) => {
            reservationResultModel.reservations.push(this.getReservation(reservationId));
        });

        return reservationResultModel;
    }

    /**
     * ログ用の形式にする
     */
    public toLog(): Object {
        let log = {
            token: this.token,
            paymentNo: this.paymentNo,
            performance: this.performance,
            reservationIds: this.reservationIds,
            profile: this.profile,
            paymentMethod: this.paymentMethod,
            member: this.member,
            staff: this.staff,
            sponsor: this.sponsor,
            reservedDocuments: this.reservedDocuments,
        };

        return log;
    }
}

interface Reservation {
    _id: string;
    token?: string;
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

    payment_no?: string,

    performance: string,
    performance_day?: string,
    performance_start_time?: string,
    performance_end_time?: string,
    theater?: string,
    theater_name?: string,
    screen?: string,
    screen_name?: string,
    film?: string,
    film_name?: string,
    purchaser_last_name?: string,
    purchaser_first_name?: string,
    purchaser_email?: string,
    purchaser_tel?: string,

    sponsor?: string,
    sponsor_user_id?: string,
    sponsor_name?: string,
    sponsor_email?: string,
    staff?: string,
    staff_user_id?: string,
    staff_name?: string,
    staff_email?: string,
    staff_department_name?: string,
    staff_tel?: string,
    staff_signature?: string,
    member?: string,
    member_user_id?: string,
}