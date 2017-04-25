import { ReservationUtil } from '@motionpicture/chevre-domain';
import { Util as GMOUtil } from '@motionpicture/gmo-service';
import * as conf from 'config';
import * as moment from 'moment';
import * as redis from 'redis';

const DEFAULT_REDIS_TTL = 1800;
const redisClient = redis.createClient(
    process.env.REDIS_PORT,
    process.env.REDIS_HOST,
    {
        password: process.env.REDIS_KEY,
        tls: { servername: process.env.REDIS_HOST },
        return_buffers: true
    }
);

const MAX_RESERVATION_SEATS_DEFAULT = 4;
const MAX_RESERVATION_SEATS_STAFFS = 10;
const MAX_RESERVATION_SEATS_LIMITED_PERFORMANCES = 10;

interface ISeat {
    code: string; // 座席コード
    grade: {
        code: string;
        name: {
            ja: string;
            en: string;
        };
        additional_charge: number; // 追加料金
    };
}
interface ISection {
    seats: ISeat[];
}

/**
 * 予約情報モデル
 *
 * 予約プロセス中の情報を全て管理するためのモデルです
 * この情報をセッションで引き継くことで、予約プロセスを管理しています
 *
 * @export
 * @class ReserveSessionModel
 */
export default class ReserveSessionModel {
    /**
     * 予約トークン
     */
    public token: string;
    /**
     * 購入管理番号
     */
    public paymentNo: string;
    /**
     * 購入確定日時タイムスタンプ
     */
    public purchasedAt: number;
    /**
     * 座席仮予約有効期限タイムスタンプ
     */
    public expiredAt: number;
    /**
     * パフォーマンス
     */
    public performance: IPerformance;
    /**
     * 決済方法選択肢
     */
    public paymentMethodChoices: string[];
    /**
     * 券種リスト
     */
    public ticketTypes: ITicketType[];
    /**
     * スクリーン内の座席グレードリスト
     */
    public seatGradeCodesInScreen: string[];
    /**
     * スクリーンの座席表HTML
     */
    public screenHtml: string;
    /**
     * 予約座席コードリスト
     */
    public seatCodes: string[];
    /**
     * 購入者セイ
     */
    public purchaserLastName: string;
    /**
     * 購入者メイ
     */
    public purchaserFirstName: string;
    /**
     * 購入者メールアドレス
     */
    public purchaserEmail: string;
    /**
     * 購入者電話番号
     */
    public purchaserTel: string;
    /**
     * 年代
     */
    public purchaserAge: string;
    /**
     * 住所
     */
    public purchaserAddress: string;
    /**
     * 性別
     */
    public purchaserGender: string;
    /**
     * 決済方法
     */
    public paymentMethod: string;
    /**
     * 購入者区分
     */
    public purchaserGroup: string;
    /**
     * GMO取引
     */
    public transactionGMO: ITransactionGMO;

    /**
     * プロセス中の購入情報をセッションから取得する
     */
    // tslint:disable-next-line:function-name
    public static async find(token: string): Promise<ReserveSessionModel | null> {
        const key = ReserveSessionModel.getRedisKey(token);
        return new Promise<ReserveSessionModel | null>((resolve, reject) => {
            redisClient.get(key, (err, reply) => {
                if (err instanceof Error) {
                    reject(err);
                    return;
                }
                if (reply === null) {
                    resolve(null);
                    return;
                }

                const reservationModel = new ReserveSessionModel();

                try {
                    const reservationModelInRedis = JSON.parse(reply.toString());
                    Object.keys(reservationModelInRedis).forEach((propertyName) => {
                        (<any>reservationModel)[propertyName] = reservationModelInRedis[propertyName];
                    });
                } catch (error) {
                    reject(error);
                    return;
                }

                resolve(reservationModel);
            });
        });
    }

    /**
     * ネームスペースを取得
     *
     * @param {string} token
     * @return {string}
     */
    private static getRedisKey(token: string): string {
        return `CHEVREReservation_${token}`;
    }

    /**
     * プロセス中の購入情報をセッションに保存する
     *
     * @param {number} [ttl] 有効期間(default: 1800)
     */
    public async save(ttl?: number): Promise<void> {
        const key = ReserveSessionModel.getRedisKey(this.token);

        if (ttl === undefined) {
            ttl = DEFAULT_REDIS_TTL;
        }

        return new Promise<void>((resolve, reject) => {
            redisClient.setex(key, ttl, JSON.stringify(this), (err: Error | void) => {
                if (err instanceof Error) {
                    console.error(err);
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    /**
     * プロセス中の購入情報をセッションから削除する
     */
    public async remove(): Promise<void> {
        const key = ReserveSessionModel.getRedisKey(this.token);
        return new Promise<void>((resolve, reject) => {
            redisClient.del(key, (err: Error | void) => {
                if (err instanceof Error) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    /**
     * 一度の購入で予約できる座席数を取得する
     */
    public getSeatsLimit(): number {
        let limit = MAX_RESERVATION_SEATS_DEFAULT;

        // 主体によっては、決済方法を強制的に固定で
        switch (this.purchaserGroup) {
            case ReservationUtil.PURCHASER_GROUP_STAFF:
            case ReservationUtil.PURCHASER_GROUP_WINDOW:
                limit = MAX_RESERVATION_SEATS_STAFFS;
                break;

            case ReservationUtil.PURCHASER_GROUP_CUSTOMER:
                if (this.performance !== undefined) {
                    // 制限枚数指定のパフォーマンスの場合
                    const performanceIds4limit2 = conf.get<string[]>('performanceIds4limit2');
                    if (performanceIds4limit2.indexOf(this.performance._id) >= 0) {
                        limit = MAX_RESERVATION_SEATS_LIMITED_PERFORMANCES;
                    }
                }

                break;

            default:
                break;
        }

        return limit;
    }

    /**
     * 合計金額を算出する
     */
    public getTotalCharge(): number {
        let total = 0;

        if (Array.isArray(this.seatCodes)) {
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

        const reservation = this.getReservation(seatCode);
        if (reservation.ticket_type_charge !== undefined) {
            charge += reservation.ticket_type_charge;
            charge += this.getChargeExceptTicketTypeBySeatCode(seatCode);
        }

        return charge;
    }

    public getChargeExceptTicketTypeBySeatCode(seatCode: string): number {
        let charge = 0;

        if (this.purchaserGroup === ReservationUtil.PURCHASER_GROUP_CUSTOMER
            || this.purchaserGroup === ReservationUtil.PURCHASER_GROUP_WINDOW
        ) {
            const reservation = this.getReservation(seatCode);

            // 座席グレード分加算
            if (reservation.seat_grade_additional_charge > 0) {
                charge += reservation.seat_grade_additional_charge;
            }

            // MX4D分加算
            if (this.performance.film.is_mx4d) {
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
    public getReservation(seatCode: string): IReservation {
        return ((<any>this)[`reservation_${seatCode}`] !== undefined) ? (<any>this)[`reservation_${seatCode}`] : null;
    }

    /**
     * 座席コードの予約情報をセットする
     */
    public setReservation(seatCode: string, reservation: IReservation): void {
        (<any>this)[`reservation_${seatCode}`] = reservation;
    }

    /**
     * フロー中の予約IDリストを取得する
     */
    public getReservationIds(): string[] {
        return (this.seatCodes !== undefined) ? this.seatCodes.map((seatCode) => this.getReservation(seatCode)._id) : [];
    }

    /**
     * 座席コードから予約(確定)ドキュメントを作成する
     *
     * @param {string} seatCode 座席コード
     */
    public seatCode2reservationDocument(seatCode: string) {
        const reservation = this.getReservation(seatCode);
        return {
            _id: reservation._id,
            status: reservation.status,
            seat_code: seatCode,
            seat_grade_name_ja: reservation.seat_grade_name_ja,
            seat_grade_name_en: reservation.seat_grade_name_en,
            seat_grade_additional_charge: reservation.seat_grade_additional_charge,
            ticket_type_code: reservation.ticket_type_code,
            ticket_type_name_ja: reservation.ticket_type_name_ja,
            ticket_type_name_en: reservation.ticket_type_name_en,
            ticket_type_charge: reservation.ticket_type_charge,

            charge: this.getChargeBySeatCode(seatCode),
            payment_no: this.paymentNo,
            purchaser_group: this.purchaserGroup,

            performance: this.performance._id,
            performance_day: this.performance.day,
            performance_open_time: this.performance.open_time,
            performance_start_time: this.performance.start_time,
            performance_end_time: this.performance.end_time,

            theater: this.performance.theater._id,
            theater_name_ja: this.performance.theater.name.ja,
            theater_name_en: this.performance.theater.name.en,
            theater_address_ja: this.performance.theater.address.ja,
            theater_address_en: this.performance.theater.address.en,

            screen: this.performance.screen._id,
            screen_name_ja: this.performance.screen.name.ja,
            screen_name_en: this.performance.screen.name.en,

            film: this.performance.film._id,
            film_name_ja: this.performance.film.name.ja,
            film_name_en: this.performance.film.name.en,
            film_image: this.performance.film.image,
            film_is_mx4d: this.performance.film.is_mx4d,
            film_copyright: this.performance.film.copyright,

            purchaser_last_name: (this.purchaserLastName !== undefined) ? this.purchaserLastName : '',
            purchaser_first_name: (this.purchaserFirstName !== undefined) ? this.purchaserFirstName : '',
            purchaser_email: (this.purchaserEmail !== undefined) ? this.purchaserEmail : '',
            purchaser_tel: (this.purchaserTel !== undefined) ? this.purchaserTel : '',
            purchaser_age: (this.purchaserAge !== undefined) ? this.purchaserAge : '',
            purchaser_address: (this.purchaserAddress !== undefined) ? this.purchaserAddress : '',
            purchaser_gender: (this.purchaserGender !== undefined) ? this.purchaserGender : '',
            payment_method: (this.paymentMethod !== undefined) ? this.paymentMethod : '',

            watcher_name: (reservation.watcher_name !== undefined) ? reservation.watcher_name : '',
            watcher_name_updated_at: (reservation.watcher_name !== undefined) ? moment().valueOf() : '',

            purchased_at: this.purchasedAt,

            gmo_shop_pass_string: (this.getTotalCharge() > 0) ? GMOUtil.createShopPassString({
                shopId: process.env.GMO_SHOP_ID,
                shopPass: process.env.GMO_SHOP_PASS,
                orderId: this.paymentNo, // todo オーダーID仕様変更につき修正すべし
                amount: this.getTotalCharge(),
                dateTime: moment(this.purchasedAt).format('YYYYMMDDHHmmss')
            }) : '',

            updated_user: 'ReserveSessionModel'
        };
    }
}

interface IPerformance {
    _id: string;
    day: string;
    open_time: string;
    start_time: string;
    end_time: string;
    start_str_ja: string;
    start_str_en: string;
    location_str_ja: string;
    location_str_en: string;
    theater: {
        _id: string,
        name: {
            ja: string,
            en: string
        },
        address: {
            ja: string,
            en: string
        }
    };
    screen: {
        _id: string,
        name: {
            ja: string,
            en: string
        },
        sections: ISection[]
    };
    film: {
        _id: string,
        name: {
            ja: string,
            en: string
        },
        image: string,
        is_mx4d: boolean,
        copyright: string
    };
}

interface ITicketType {
    code: string;
    name: {
        ja: string,
        en: string
    };
    charge: number; // 料金
}

interface IReservation {
    _id: string;
    status: string;
    seat_code: string;
    seat_grade_name_ja: string;
    seat_grade_name_en: string;
    seat_grade_additional_charge: number;

    ticket_type_code: string;
    ticket_type_name_ja: string;
    ticket_type_name_en: string;
    ticket_type_charge: number;

    watcher_name: string;
}

interface ITransactionGMO {
    orderId: string;
    accessId: string;
    accessPass: string;
    amount: number;
    count: number;
    status: string;
}
