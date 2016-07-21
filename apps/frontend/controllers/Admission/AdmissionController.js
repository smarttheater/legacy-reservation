"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var BaseController_1 = require('../BaseController');
var Models_1 = require('../../../common/models/Models');
var ReservationUtil_1 = require('../../../common/models/Reservation/ReservationUtil');
var FilmUtil_1 = require('../../../common/models/Film/FilmUtil');
var AdmissionController = (function (_super) {
    __extends(AdmissionController, _super);
    function AdmissionController() {
        _super.apply(this, arguments);
    }
    AdmissionController.prototype.performances = function () {
        this.res.render('admission/performances', {
            FilmUtil: FilmUtil_1.default
        });
    };
    AdmissionController.prototype.confirm = function () {
        var _this = this;
        var performanceId = this.req.params.id;
        Models_1.default.Reservation.find({
            performance: performanceId,
            status: ReservationUtil_1.default.STATUS_RESERVED
        }).exec(function (err, reservationDocuments) {
            var reservationsById = {};
            for (var _i = 0, reservationDocuments_1 = reservationDocuments; _i < reservationDocuments_1.length; _i++) {
                var reservationDocument = reservationDocuments_1[_i];
                reservationsById[reservationDocument.get('_id')] = reservationDocument;
            }
            _this.res.render('admission/confirm', {
                reservationsById: reservationsById
            });
        });
    };
    AdmissionController.prototype.add = function () {
        var reservationId = this.req.body.reservationId;
        this.res.json({
            isSuccess: true
        });
    };
    return AdmissionController;
}(BaseController_1.default));
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AdmissionController;
