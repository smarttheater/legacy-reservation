import BaseController from '../BaseController';
import Util from '../../../common/Util/Util';
import Models from '../../../common/models/Models';
import ReservationUtil from '../../../common/models/Reservation/ReservationUtil';
import ReservationModel from '../../models/Reserve/ReservationModel';

export default class ReserveController extends BaseController {
    /**
     * 座席の状態を取得する
     */
    public getSeatProperties() {
        let token = this.req.params.token;
        ReservationModel.find(token, (err, reservationModel) => {
            if (err || reservationModel === null) {
                return this.res.json({
                    propertiesBySeatCode: {}
                });
            }

            // 予約リストを取得
            Models.Reservation.find(
                {
                    performance: reservationModel.performance._id
                },
                'seat_code status staff staff_name staff_department_name sponsor member',
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
                                        classes.push('popover-reservation');

                                        attrs['data-tabindex-id'] = '0';
                                        attrs['data-toggle'] = 'popover';
                                        attrs['data-trigger'] = 'focus';

                                        let contents = '';
                                        switch (reservationDocument.get('status')) {
                                            case ReservationUtil.STATUS_RESERVED:
                                                if (reservationDocument.get('staff')) {
                                                    contents =  '内部';
                                                } else if (reservationDocument.get('sponsor')) {
                                                    contents =  '外部';
                                                } else if (reservationDocument.get('member')) {
                                                    contents =  '当選者';
                                                } else {
                                                    contents =  '一般';
                                                }

                                                break;

                                            case ReservationUtil.STATUS_TEMPORARY:
                                                contents =  '仮予約';
                                                break;

                                            case ReservationUtil.STATUS_WAITING_SETTLEMENT:
                                                contents =  '待ち';
                                                break;

                                            default:
                                                break;
                                        }

                                        attrs['data-contents'] = contents;

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
