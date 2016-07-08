import BaseController from '../BaseController';
import Util from '../../../common/Util/Util';
import Models from '../../../common/models/Models';
import ReservationUtil from '../../../common/models/Reservation/ReservationUtil';
import ReservationModel from '../../models/Reserve/ReservationModel';

export default class ReserveController extends BaseController {
    /**
     * 空席状況マップを生成する
     */
    public showSeatsMap() {
        let token = this.req.params.token;
        ReservationModel.find(token, (err, reservationModel) => {
            if (err || reservationModel === null) {
                return this.res.send('false');
            }

            // 予約リストを取得
            Models.Reservation.find(
                {
                    performance: reservationModel.performance._id
                },
                {},
                {},
                (err, reservationDocuments) => {
                    if (err) {
                        this.res.json({
                            propertiesBySeatCode: {}
                        });

                    } else {
                        // 仮押さえ中の座席コードリスト
                        let seatCodesInReservation = reservationModel.getSeatCodes();

                        let propertiesBySeatCode = {};

                        for (let reservationDocument of reservationDocuments) {
                            let seatCode = reservationDocument.get('seat_code');

                            let properties = {};
                            let classes = [];
                            let attrs = {};



                            attrs['data-reservation-id'] = reservationDocument.get('_id');

                            if (reservationDocument.get('status') === ReservationUtil.STATUS_AVAILABLE) {
                                // 予約可能
                                classes.push('select-seat');

                            } else {
                                if (seatCodesInReservation.indexOf(seatCode) >= 0) {
                                    // 仮押さえ中
                                    classes.push('select-seat', 'active');

                                } else {

                                    // 予約不可
                                    classes.push('disabled');


                                    // 内部関係者の場合、予約情報ポップアップ
                                    if (reservationModel.staff) {
                                        // $(this).addClass('popover-reservation');
                                        // $(this).attr('tabindex', '0');
                                        // $(this).attr('data-toggle', 'popover');
                                        // $(this).attr('data-trigger', 'focus');

                                        // var contents = '';
                                        // if (reservationDocument.status == 'RESERVED') {
                                        //     if (reservationDocument.staff) {
                                        //         contents =  '内部';
                                        //     } else if (reservationDocument.sponsor) {
                                        //         contents =  '外部';
                                        //     } else if (reservationDocument.member) {
                                        //         contents =  '当選者';
                                        //     } else {
                                        //         contents =  '一般';
                                        //     }

                                        // } else if (reservationDocument.status == 'TEMPORARY') {
                                        //     contents =  '仮予約';

                                        // } else if (reservationDocument.status == 'WAITING_SETTLEMENT') {
                                        //     contents =  '待ち';

                                        // }

                                        // $(this).attr('data-contents', contents);

                                    } else {

                                    }


                                }

                            }



                            properties['classes'] = classes;
                            properties['attrs'] = attrs;
                            propertiesBySeatCode[seatCode] = properties;
                        }



                        this.res.json({
                            propertiesBySeatCode: propertiesBySeatCode
                        });

                    }
                }
            );
        });
    }
}
