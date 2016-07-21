"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var BaseController_1 = require('../../BaseController');
var ReservationUtil_1 = require('../../../../common/models/Reservation/ReservationUtil');
var Models_1 = require('../../../../common/models/Models');
var StaffMyPageController = (function (_super) {
    __extends(StaffMyPageController, _super);
    function StaffMyPageController() {
        _super.apply(this, arguments);
    }
    StaffMyPageController.prototype.index = function () {
        this.res.render('staff/mypage/index', {
            layout: 'layouts/staff/layout',
        });
    };
    /**
     * マイページ予約検索API
     */
    StaffMyPageController.prototype.search = function () {
        var _this = this;
        var limit = 2;
        var page = (this.req.query.page) ? this.req.query.page : 1;
        var day = (this.req.query.day) ? this.req.query.day : null;
        var startTime = (this.req.query.start_time) ? this.req.query.start_time : null;
        var film = (this.req.query.film) ? this.req.query.film : null;
        var words = (this.req.query.words) ? this.req.query.words : null;
        // 検索条件を作成
        var conditions = [];
        conditions.push({ staff: this.staffUser.get('_id') });
        conditions.push({ status: ReservationUtil_1.default.STATUS_RESERVED });
        if (film) {
            conditions.push({ film: film });
        }
        if (day) {
            conditions.push({ performance_day: day });
        }
        if (startTime) {
            conditions.push({
                performance_start_time: {
                    $gte: startTime,
                }
            });
        }
        if (words) {
            conditions.push({
                $or: [
                    {
                        film_name: { $regex: "" + words }
                    },
                    {
                        staff_signature: { $regex: "" + words }
                    },
                    {
                        watcher_name: { $regex: "" + words }
                    }
                ]
            });
        }
        // 総数検索
        Models_1.default.Reservation.count({
            $and: conditions
        }, function (err, count) {
            Models_1.default.Reservation.find({
                $and: conditions
            }, {}, {
                sort: { staff: 1, seat_code: 1 }
            })
                .skip(limit * (page - 1))
                .limit(limit)
                .populate('staff screen')
                .exec(function (err, reservationDocuments) {
                if (err) {
                }
                else {
                    conditions['page'] = page;
                    _this.res.json({
                        isSuccess: true,
                        // conditions: conditions,
                        results: reservationDocuments,
                        count: count
                    });
                }
            });
        });
    };
    StaffMyPageController.prototype.updateWatcherName = function () {
        var _this = this;
        var reservationId = this.req.body.reservationId;
        var watcherName = this.req.body.watcherName;
        this.logger.debug('updating watcher_name... id:', reservationId);
        Models_1.default.Reservation.findOneAndUpdate({
            staff: this.staffUser.get('_id'),
            status: ReservationUtil_1.default.STATUS_RESERVED,
            _id: reservationId,
        }, {
            watcher_name: watcherName,
            staff_signature: this.staffUser.get('signature'),
        }, {
            new: true
        }, function (err, reservationDocument) {
            _this.logger.debug('updated watcher_name. reservationDocument:', reservationDocument);
            if (err || reservationDocument === null) {
                _this.res.json({
                    isSuccess: false,
                    reservationId: null
                });
            }
            else {
                _this.res.json({
                    isSuccess: true,
                    reservation: reservationDocument.toObject()
                });
            }
        });
    };
    return StaffMyPageController;
}(BaseController_1.default));
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = StaffMyPageController;
