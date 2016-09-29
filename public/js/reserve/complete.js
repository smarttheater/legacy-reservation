$(function(){
    var locale = $('html').attr('lang');
    var url4transfering = '';
    var reservationID4transfering = '';
    var reservationsById = JSON.parse($('input[name="reservationsById"]').val());

    $(document).on('click', '.send-mail', function(){
        url4transfering = $(this).attr('data-url');
        reservationID4transfering = $(this).attr('data-reservation-id');

        $('.transfering .errmsg').text('');
        $('.transfering input[name="email"]').val('');
        $('.transfering').modal('show');
    });

    $(document).on('click', '.execute-transfer', function(){
        var to = $('.transfering input[name="email"]').val();
        if (!to) {
            $('.transfering .errmsg').text((locale === 'ja') ? 'メールアドレスを入力してください' : 'Enter an email address.');
            return;
        }

        $.ajax({
            dataType: 'json',
            url: url4transfering,
            type: 'POST',
            data: {
                id: reservationID4transfering,
                to: to
            },
            beforeSend: function() {
                $('.transfering').modal('hide');
                $('.loading .modal-body .text-center').hide();
                $('.loading .modal-body .text-center.sending').show();
                $('.loading').modal();
            }
        }).done(function(data) {

            if (data.success) {
                $('.loading .modal-body .text-center').hide();
                $('.loading .modal-body .text-center.sent').show();
                $('.loading').modal();
            } else {
                $('.loading').modal('hide');

                setTimeout(function() {
                    $('.transfering .errmsg').text(data.message);
                    $('.transfering').modal();
                }, 500);
                // $('.loading .modal-body .text-center.unsent').show();
            }
        }).fail(function(jqxhr, textStatus, error) {

        }).always(function(data) {

        });
    });

    //　当日入場券サーマル印刷
    $(document).on('click', '.btn-thermalprint', function(){
        // 予約オブジェクトを渡す
        var _reservation = reservationsById[$(this).attr('data-reservation-id')];
        return tiffThermalPrint.printReservation(_reservation);
    });

    //　当日入場券一括サーマル印刷
    $(document).on('click', '.btn-thermalprintall', function(){
        // 予約オブジェクトの配列を渡す
        var reservations = [];
        Object.keys(reservationsById).forEach(function(key){
            var _reservation = reservationsById[key];
            reservations.push(_reservation);
        });

        return tiffThermalPrint.printReservationArray(reservations);
    });
});