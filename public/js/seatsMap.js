
function showSeatsMap() {
    $.ajax({
        dataType: 'json',
        url: `/reserve/${$('.seatsMap').attr('data-token')}/showSeatsMap`,
        type: 'GET',
        data: {},
        beforeSend: function() {
        },
        complete: function() {
            loadHandler();


            // 予約の吹き出し(内部関係者のみの機能)
            // $('.popover-reservation').popover({
            //     placement: 'top',
            //     html: true,
            //     content: function(){
            //         return $(this).attr('data-contents');
            //     }
            // });



            // 20秒おきに状況とりにいく
            // setTimeout(function(){
            //     showSeatsMap()
            // }, 20000);
        },
        success: function(data) {
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

            $('.seatsMap').removeClass('hidden');

        },
        error: function(jqxhr, textStatus, error) {
        }
    });
}

$(function(){
    // 座席マップを表示
    showSeatsMap();

    $(document).on('click', '.select-seat', function(){
        if (isDeviceType('sp') && state === STATE_DEFAULT) {
            return;
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
        var reservationIds = [];

        // 座席コードリストを取得
        $('.select-seat.active').each(function(index){
            reservationIds.push($(this).attr('data-reservation-id'));
        });

        if (reservationIds.length < 1) {
            alert('座席を選択してください');
        } else {
            $('form input[name="reservationIds"]').val(JSON.stringify(reservationIds));
            $('form').submit();
        }
    });

});







var resizeTimer = null;
var STATE_DEFAULT = 0;
var STATE_ZOOM = 1;
var state = STATE_DEFAULT;
var pos = {
    x: 0,
    y: 0
};

$(function(){
    $(window).on('load', function(){
        loadHandler();
    });

    $(window).on('resize', function(){
        if (resizeTimer) {
            clearTimeout(resizeTimer);
        }
        resizeTimer = setTimeout(function () {
            resizeHandler();
        }, 300);
    });

    $(document).on('click', '.screen', function(e) {
        if (isDeviceType('sp')) {
            screenClickHandler(e);
        }
    });

    $(document).on('click', '.zoom-btn a', function(e) {
        e.preventDefault();
        e.stopPropagation();
        resize();
    });

    $(document).on('touchstart', '.screen', function(e) {
        if (isDeviceType('sp')) {
            if (state === STATE_ZOOM) {
                screenTouchStartHandler(e);
            }
        }
    });

    $(document).on('touchmove', '.screen', function(e) {
        if (isDeviceType('sp')) {
            if (state === STATE_ZOOM) {
                e.preventDefault();
                screenTouchMoveHandler(e);
            }
        }
    });

    $(document).on('touchend', '.screen', function(e) {
        if (isDeviceType('sp')) {
            if (state === STATE_ZOOM) {
                screenTouchEndHandler(e);
            }
        }
    });
});


function loadHandler() {
    resize();
}

function resizeHandler() {
    resize();
}

function screenClickHandler(_event) {
    var screen = $('.screen');
    var inner = screen.find('.screen-inner');
    var x = _event.pageX - screen.offset().left;
    var y = _event.pageY - screen.offset().top;
    if (state !== STATE_ZOOM) {
        zoom(x, y);
    }
    
}

function screenTouchStartHandler(_event) {
    var screen = $('.screen');
    var inner = screen.find('.screen-inner');
    var pageX = _event.originalEvent.touches[0].pageX;
    var pageY = _event.originalEvent.touches[0].pageY;
    var x = pageX - screen.offset().left;
    var y = pageY - screen.offset().top;
    pos.x = x;
    pos.y = y;
    inner.removeClass('transition');
}

function screenTouchMoveHandler(_event) {
    var screen = $('.screen');
    var inner = screen.find('.screen-inner');
    var pageX = _event.originalEvent.touches[0].pageX;
    var pageY = _event.originalEvent.touches[0].pageY;
    var x = pageX - screen.offset().left;
    var y = pageY - screen.offset().top;
    var left = inner.position().left - (pos.x - x);
    var top = inner.position().top - (pos.y - y);
    inner.css({
        top: top,
        left: left
    });
    pos.x = x;
    pos.y = y;
}

function screenTouchEndHandler(_event) {
    
}

function zoom(_x, _y) {
    var screen = $('.screen');
    var inner = screen.find('.screen-inner');
    var ratio = $(window).width() / inner.width();
    var zoom = 2;
    var top = 0;
    var left = 0;
    top = (screen.height() / 2) - (_y * zoom);
    left = ($(window).width() / 2) - (_x * zoom);
    inner.addClass('transition');
    inner.css({
        top: top,
        left: left,
        transform: 'scale('+ zoom * ratio +')'
    });
    state = STATE_ZOOM;
    $('.zoom-btn').addClass('active');
}

function resize() {
    var screen = $('.screen');
    var inner = screen.find('.screen-inner');
    if (isDeviceType('sp')) {
        var ratio = $('.seatsMap').width() / inner.width();
        inner.css({
            top: 0,
            left: 0,
            transformOrigin: '0 0',
            transform: 'scale('+ ratio +')'
        });
        screen.height(inner.height() * ratio);
        $('.zoom-btn').removeClass('active');
    } else {
        inner.css({
            top: 0,
            left: 0,
            transform: 'none'
        });
        screen.height(inner.height());
        $('.zoom-btn').removeClass('active');
    }
    state = STATE_DEFAULT;
}

function isDeviceType(_type) {
    var target;
    if (_type.toLowerCase() === 'pc') {
        target = $('.device-type-pc');
    } else if (_type.toLowerCase() === 'sp') {
        target = $('.device-type-sp');
    }
    if (target.is(':visible')) {
        return true;
    }
    return false;
}