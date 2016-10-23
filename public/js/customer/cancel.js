$(function(){
    var locale = $('html').attr('lang');    
    var reservations4cancel = null; // キャンセルしようとしている予約リスト

    $('.confirm-cancel').on('click', function(){
        reservations4cancel = null;

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
                $('.accountForm').hide();
                reservationIds4cancel = [];
            }
        }).done(function(data) {
            if (data.success) {
                reservations4cancel = data.reservations;

                var html = ''
                        + '<tr><th>購入番号<br>Transaction number</th><td>' + data.reservations[0].payment_no + '</td></tr>'
                        + '<tr><th>タイトル<br>Title</th><td>' + data.reservations[0].film_name_ja + '<br>' + data.reservations[0].film_name_en + '</td></tr>'
                        + '<tr><th>上映時間/場所<br>Date/Location</th><td>'
                            + data.reservations[0].performance_start_str_ja + '  ' + data.reservations[0].location_str_ja
                            + '<br>' + data.reservations[0].performance_start_str_en + '  ' + data.reservations[0].location_str_en
                        + '</td></tr>'
                        + '<tr><th>座席<br>Seat</th><td>';

                data.reservations.forEach(function(reservation, index){
                    if (index > 0) html += ', ';
                    html += reservation.seat_code;
                });
                html += '<br>※キャンセルは購入番号単位となります。<br>*You can cancel the reservation with the transaction number.';
                html += '</td></tr>';

                $('.table-reservation-confirm').html(html);
                $('.cancel-reservation-confirm').modal();
            } else {
                $('.errmsg').html(data.message);
            }
        }).fail(function(jqxhr, textStatus, error) {
            $('.errmsg').text('Unexpected Error.');
        }).always(function(data) {
        });
    });

    $('.execute-cancel').on('click', function(){
        // コンビニ決済の場合、EWフォームへリダイレクト
        if (reservations4cancel[0].payment_method === '3') {
            return location.href = "https://reg18.smp.ne.jp/regist/is?SMPFORM=lcld-nimgm-06e554249b87102fbffdf75273feefbf&ticket=" + reservations4cancel[0].payment_no;
        }

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
                $('.loading').modal();
            }
        }).done(function(data) {
            $('.loading').modal('hide');

            if (data.success) {
                $('input[name="paymentNo"]').val("");
                $('input[name="last4DigitsOfTel"]').val("");
                $('.cancel-reservation-complete').modal();
            } else {
                alert("キャンセルできませんでした。\nFailed in canceling." + data.message);

            }
        }).fail(function(jqxhr, textStatus, error) {
            alert("キャンセルできませんでした。\nFailed in canceling.");
        }).always(function(data) {
        });
    });
});