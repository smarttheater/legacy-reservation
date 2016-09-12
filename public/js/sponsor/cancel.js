$(function(){
    $('.confirm-cancel').on('click', function(){
        $.ajax({
            dataType: 'json',
            type: 'POST',
            url: $(this).attr('data-url'),
            data: {
                paymentNo: $('input[name="paymentNo"]').val(),
                last4DigitsOfTel: $('input[name="last4DigitsOfTel"]').val()
            },
            beforeSend: function() {
                $('.errmsg').text('');
                $('.cancel-reservation-confirm').modal('hide');
            }
        }).done(function(data) {
            if (data.success) {
                var seatCodes = data.reservations.map(function(reservation){return reservation.seat_code;});

                $('.table-reservation-confirm').html(
                      '<tr><th>購入番号:</th><td>' + data.reservations[0].payment_no + '</td></tr>'
                    + '<tr><th>タイトル:</th><td>' + data.reservations[0].film_name_ja + '</td></tr>'
                    + '<tr><th>上映時間/場所:</th><td>' + data.reservations[0].performance_day + ' ' + data.reservations[0].performance_start_time + '- ' + data.reservations[0].theater_name_ja + '' + data.reservations[0].screen_name_ja + '</td></tr>'
                    + '<tr><th>座席</th><td>' + seatCodes.join(' / ') + '</td></tr>'
                );

                $('.cancel-reservation-confirm').modal();

            } else {
                $('.errmsg').text(data.message);

            }
        }).fail(function(jqxhr, textStatus, error) {

        }).always(function(data) {

        });
    });

    $('.execute-cancel').on('click', function(){
        $.ajax({
            dataType: 'json',
            type: 'POST',
            url: $(this).attr('data-url'),
            data: {
                paymentNo: $('input[name="paymentNo"]').val(),
                last4DigitsOfTel: $('input[name="last4DigitsOfTel"]').val()
            },
            beforeSend: function() {
                $('.cancel-reservation-confirm').modal('hide');
            }
        }).done(function(data) {
            if (data.success) {
                $('.cancel-reservation-complete').modal();

            } else {
                alert('キャンセルできませんでした');

            }
        }).fail(function(jqxhr, textStatus, error) {

        }).always(function(data) {

        });
    });
});