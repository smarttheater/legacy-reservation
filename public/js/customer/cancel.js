$(function(){
    var locale = $('html').attr('lang');    
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
                reservationIds4cancel = [];
            }
        }).done(function(data) {
            if (data.success) {
                var html;
                if (locale === 'ja') {
                    html = 
                        '<tr><th>購入番号:</th><td>' + data.reservations[0].payment_no + '</td></tr>'
                        + '<tr><th>タイトル:</th><td>' + data.reservations[0].film_name_ja + '</td></tr>'
                        + '<tr><th>上映時間/場所:</th><td>' + data.reservations[0].performance_start_str_ja + '  ' + data.reservations[0].location_str_ja + '</td></tr>'
                        + '<tr><th>座席</th><td>';
                } else {
                    html = 
                        '<tr><th>Transaction number:</th><td>' + data.reservations[0].payment_no + '</td></tr>'
                        + '<tr><th>Title:</th><td>' + data.reservations[0].film_name_en + '</td></tr>'
                        + '<tr><th>Date/Location:</th><td>' + data.reservations[0].performance_start_str_en + '  ' + data.reservations[0].location_str_en + '</td></tr>'
                        + '<tr><th>Seat</th><td>';
                }

                data.reservations.forEach(function(reservation, index){
                    html += reservation.seat_code + ', '
                });
                html += '</td></tr>';

                $('.table-reservation-confirm').html(html);

                // コンビニ決済の場合、口座情報入力フォーム追加
                // if (data.reservations[0].payment_method === '3') {
                var  accountForm = ''
                            + '<div class="form-group form-inline">'
                                + '<label>口座番号</label>'
                                + '<input type="text" class="form-control" name="" value="">'
                            + '</div>'
                            + '<div class="form-group form-inline">'
                                + '<label>名義</label>'
                                + '<input type="text" class="form-control" name="" value="">'
                            + '</div>';
                // }
                $('.cancel-reservation-confirm').modal();
            } else {
                $('.errmsg').text(data.message);
            }
        }).fail(function(jqxhr, textStatus, error) {
            $('.errmsg').text('Unexpected Error.');
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
            alert('キャンセルできませんでした');
        }).always(function(data) {
        });
    });
});