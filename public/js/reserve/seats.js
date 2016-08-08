var screenSeatStatusesMap;

/**
 * 空席状況マップを表示する
 */
function showSeatStatusesMap() {
    $.ajax({
        dataType: 'json',
        url: '/reserve/' + $('.seatStatusesMap').attr('data-token') + '/getSeatProperties',
        type: 'GET',
        data: {},
        beforeSend: function() {
        }
    }).done(function(data) {
        var propertiesBySeatCode = data.propertiesBySeatCode;

        $('.seat a').each(function(index){
            var seatCode = $(this).attr('data-seat-code');
            var aNode = $(this);

            // 予約が存在した場合のみ販売可能
            if (propertiesBySeatCode.hasOwnProperty(seatCode)) {
                // プロパティをセット
                var properties = propertiesBySeatCode[seatCode];

                aNode.addClass(properties.classes.join(' '));

                Object.keys(properties.attrs).forEach(function(key){
                    aNode.attr(key, properties.attrs[key]);
                });

            } else {
                // 未販売
                aNode.addClass('disabled');

            }

        });

        $('.seatStatusesMap').removeClass('hidden');

    }).fail(function(jqxhr, textStatus, error) {
    }).always(function() {

        screenSeatStatusesMap = new ScreenSeatStatusesMap($('.screen'));


        // 20秒おきに状況とりにいく
        // setTimeout(function(){
        //     showSeatStatusesMap()
        // }, 20000);
    });
}

$(function(){
    var limit = parseInt($('input[name="seatsLimit"]').val());
    var limitMessage = $('input[name="seatsLimitMessage"]').val();

    showSeatStatusesMap();

    $(document).on('click', '.select-seat', function(){
        if (screenSeatStatusesMap.isDeviceType('sp') && screenSeatStatusesMap.state === screenSeatStatusesMap.STATE_DEFAULT) {
            return;
        }


        // check seats limit
        if (!$(this).hasClass('active')) {
            if ($('.select-seat.active').length > limit - 1) {
                alert(limitMessage);
                return;
            }
        }

        // カウンター機能は、外部関係者のみのための機能
        var count = parseInt($('.reservable-count').text());
        if ($(this).hasClass('active')) {
            $('.reservable-count').text(count + 1);
        } else {
            $('.reservable-count').text(count - 1);
        }



        $(this).toggleClass('active');
    });

    $(document).on('click', '.select-seats', function(){
        var seatCodes = [];

        // 座席コードリストを取得
        $('.select-seat.active').each(function(index){
            seatCodes.push($(this).attr('data-seat-code'));
        });

        if (seatCodes.length < 1) {
            alert($('input[name="messageRequiredSeat"]').val());
        } else {
            var form = $('<form/>', {'method': 'post'}); // location.hrefにpostする
            form.append($('<input/>', {
                'type': 'hidden',
                'name': 'seatCodes',
                'value': JSON.stringify(seatCodes)
            }));
            form.appendTo(document.body);
            form.submit();
        }
    });

});
