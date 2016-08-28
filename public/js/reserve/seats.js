$(function(){
    var _limit = parseInt($('input[name="seatsLimit"]').val());
    var _screenSeatStatusesMap;

    showSeatStatusesMap();

    /**
     * 空席状況マップを表示する
     */
    function showSeatStatusesMap() {
        $.ajax({
            dataType: 'json',
            url: $('.seatStatusesMap').attr('data-url'),
            type: 'GET',
            data: {},
            beforeSend: function() {
            }
        }).done(function(data) {
            var propertiesBySeatCode = data.propertiesBySeatCode;

            $('.seat a').each(function(){
                var seatCode = $(this).attr('data-seat-code');
                var aNode = $(this);

                // 予約が存在した場合のみ販売可能
                if (propertiesBySeatCode.hasOwnProperty(seatCode)) {
                    // プロパティをセット
                    var properties = propertiesBySeatCode[seatCode];

                    aNode.addClass(properties.classes.join(' '));

                    Object.keys(properties.attrs).forEach(function(key) {
                        aNode.attr(key, properties.attrs[key]);
                    });
                } else {
                    // 予約データがない場合、空席
                    aNode.addClass('select-seat');
                    aNode.attr('data-baloon-content', seatCode);
                }
            });
        }).fail(function(jqxhr, textStatus, error) {
        }).always(function() {
            _screenSeatStatusesMap = new ScreenSeatStatusesMap($('.screen'));
            $('.seatStatusesMap').removeClass('hidden');

            // 20秒おきに状況とりにいく(現在選択中の座席もリセットされてしまう状態を解消できていないので、とりあえずしない)
            // setTimeout(function(){
            //     showSeatStatusesMap()
            // }, 20000);
        });
    }

    /**
     * 座席クリックイベント
     */
    $(document).on('click', '.select-seat', function(){
        // スマホで拡大操作
        if (_screenSeatStatusesMap.isDeviceType('sp') && _screenSeatStatusesMap.state === ScreenSeatStatusesMap.STATE_DEFAULT) {
            return;
        }

        // 座席数上限チェック
        if (!$(this).hasClass('active')) {
            if ($('.select-seat.active').length > _limit - 1) {
                alert($('input[name="seatsLimitMessage"]').val());
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

    /**
     * 次へクリックイベント
     */
    $(document).on('click', '.btn-next', function(){
        // 座席コードリストを取得
        var seatCodes = $('.select-seat.active').map(function(){return $(this).attr('data-seat-code')}).get();

        if (seatCodes.length < 1) {
            alert($('input[name="messageRequiredSeat"]').val());
        } else {
            // location.hrefにpostする
            var form = $('<form/>', {'method': 'post'});
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
