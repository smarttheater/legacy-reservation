$(function(){
    var _limit = parseInt($('input[name="seatsLimit"]').val());
    var _screenSeatStatusesMap;
alert(_limit);
    /** 初期状態で選択中だった座席コード(仮予約中の座席) */
    var _initialActiveSeatCodes = JSON.parse($('.seatStatusesMap').attr('data-seat-codes'));
    /** 現在選択中の座席 */
    var _activeSeatCodes = _initialActiveSeatCodes;
alert(_initialActiveSeatCodes);
});
