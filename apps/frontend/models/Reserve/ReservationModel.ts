import ReservationResultModel from './ReservationResultModel';
import Util from '../../../common/Util/Util';
import ReservationUtil from '../../../common/models/Reservation/ReservationUtil';

import mongoose = require('mongoose');

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
        /**
         * 劇場
         */
        theater: {
            _id: string,
            name: string,
            name_en: string,
        },
        /**
         * スクリーン
         */
        screen: {
            _id: string,
            name: string,
            name_en: string,
        },
        /**
         * 作品
         */
        film: {
            _id: string,
            name: string,
            name_en: string,
        },
    };

    public screenSeatCodes: Array<string>;

    /**
     * 選択座席コードリスト
     */
    public seatCodes: Array<string>;

    /**
     * 券種選択リスト
     */
    public ticketChoices: Array<{
        seat_code: string,
        ticket: {
            type: string,
            name: string,
            name_en: string,
            price: number
        }
    }>;

    /**
     * 座席指定リスト(外部関係者)
     */
    public seatChoicesBySponsor: Array<{
        seat_code: string,
        watcher_name: string,
        ticket: {
            type: string,
            name: string,
            name_en: string,
            price: number
        }
    }>;

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
     * プロセス中の購入情報をセッションに保存する
     * 
     * 有効期間: 3600秒
     */
    public save(cb: (err: Error) => any) {
        let client = Util.getRedisClient();
        let key = ReservationModel.getRedisKey(this.token);
        client.setex(key, 3600, JSON.stringify(this), (err, reply) => {
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
        client.get(key, (err, reply) => {
            client.quit();

            if (err) {
                cb(err, null);
            } else {
                if (reply === null) {
                    cb(err, null);

                } else {
                    let reservationModel = new ReservationModel();
                    let reservationModelInRedis = JSON.parse(reply);
                    for (let propertyName in reservationModelInRedis) {
                        reservationModel[propertyName] = reservationModelInRedis[propertyName];
                    }

                    cb(err, reservationModel);
                }
            }
        });
    }

    /**
     * 購入用ネームスペースを取得
     *
     * @param {string} token
     * @return {string}
     */
    private static getRedisKey(token): string {
        return `TIFFReservation_${token}`;
    }

    public getTotalPrice() {
        let total = 0;

        if (Array.isArray(this.ticketChoices) && this.ticketChoices.length > 0) {
            for (let choice of this.ticketChoices) {
                total += choice.ticket.price;
            }
        } else if (Array.isArray(this.seatChoicesBySponsor) && this.seatChoicesBySponsor.length > 0) {
            for (let choice of this.seatChoicesBySponsor) {
                total += choice.ticket.price;
            }
        }

        return total;
    }

    /**
     * 予約ドキュメントへ変換
     */
    public toReservationDocuments(): Array<Object> {
        let documents: Array<Object> = [];

        for (let choice of this.ticketChoices) {
            let document = {
                token: this.token,
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

                seat_code: choice.seat_code,
                ticket_type: choice.ticket.type,
                ticket_name: choice.ticket.name,

                created_user: this.constructor.toString(),
                updated_user: this.constructor.toString(),
            };

            documents.push(document);
        }

        return documents;
    }

    /**
     * 購入結果モデルへ変換
     */
    public toReservationResult(): ReservationResultModel {
        let reservationResultModel = new ReservationResultModel();

        reservationResultModel.token = this.token;
        reservationResultModel.paymentNo = this.paymentNo;
        reservationResultModel.performance = this.performance;
        reservationResultModel.seatCodes = this.seatCodes;
        reservationResultModel.screenSeatCodes = this.screenSeatCodes;
        reservationResultModel.ticketChoices = this.ticketChoices;
        reservationResultModel.profile = this.profile;
        reservationResultModel.paymentMethod = this.paymentMethod;

        return reservationResultModel;
    }

    /**
     * 購入ログ用の形式にする
     */
    public toLog(): Object {
        let log = {
            token: this.token
        };

        return log;
    }
}
