$(function(){
    var reservationsById = JSON.parse($('input[name="reservationsById"]').val());
    var reservationIds = Object.keys(reservationsById);
    var enteredReservationIds = [];
    var confirmingReservationIds = [];
    var confirmedReservationIds = [];
    var audioYes = new Audio('/audio/yes01.mp3');
    var audioNo = new Audio('/audio/no01.mp3');

    function check(reservationId) {
        if (!reservationId) {
            return false;
        }

        var result = '';

        // reservation exist. OK
        if (reservationIds.indexOf(reservationId) >= 0) {
            audioYes.load();
            audioYes.play();

            // already confirmed.
            if (confirmedReservationIds.indexOf(reservationId) >= 0) {
                result = _reservation.seat_code+' ['+_reservation.ticket_type_name_ja+'] 入場済み';
            } else {
                var _reservation = reservationsById[reservationId];
                result = _reservation.seat_code+' ['+_reservation.ticket_type_name_ja+'] OK';

                // add to list for admission.
                if (confirmingReservationIds.indexOf(reservationId) < 0) {
                    enteredReservationIds.push(reservationId);
                    confirmingReservationIds.push(reservationId);

                    updateResults();
                }

            }


            if (_reservation.ticket_type === '03') {
                $('.result').html(
                    '<div class="alert confirm-ok" role="alert">'+
                        '<span class="inner">'+
                            '<span class="glyphicon glyphicon glyphicon-ok-sign" aria-hidden="true"></span>'+result+
                        '</span>'+
                    '</div>'
                );
            } else if (_reservation.ticket_type === '02') {
                $('.result').html(
                    '<div class="alert confirm-ok" role="alert">'+
                        '<span class="inner">'+
                            '<span class="glyphicon glyphicon glyphicon-ok-sign" aria-hidden="true"></span>'+result+
                        '</span>'+
                    '</div>'
                );
            } else {
                $('.result').html(
                    '<div class="alert confirm-ok" role="alert">'+
                        '<span class="inner">'+
                            '<span class="glyphicon glyphicon glyphicon-ok-sign" aria-hidden="true"></span>'+result+
                        '</span>'+
                    '</div>'
                );
            }

        // NG
        } else {
            audioNo.load();
            audioNo.play();

            result = 'NG';

            $('.result').html(
                '<div class="alert confirmresult confirmresult-ng" role="alert">'+
                    '<span class="inner">'+
                        '<span class="glyphicon glyphicon-remove-sign" aria-hidden="true"></span>'+result+
                    '</span>'+
                '</div>'
            );
        }
    }

    /**
    * 入場フラグを送信する
    */
    function addAdmission() {
        if (confirmingReservationIds.length < 1) {
            setTimeout(function(){
                addAdmission();
            },2000);

        } else {
            var reservationId = confirmingReservationIds[0];
            $.ajax({
                dataType: 'json',
                url: '/api/reservation/' + reservationId + '/enter',
                type: 'POST',
                data: {},
                beforeSend: function() {
                }
            }).done(function(data) {
                if (data.success) {
                    console.log('entered. reservationId', reservationId);
                    confirmingReservationIds.splice(confirmingReservationIds.indexOf(reservationId), 1);
                    confirmedReservationIds.push(reservationId);
                }
            }).fail(function(jqxhr, textStatus, error) {

            }).always(function() {
                updateResults();
                addAdmission();
            });
        }
    }

    /**
     * 入場結果リストを更新する
     */
    function updateResults() {
        var html = ''

        for (var i = enteredReservationIds.length - 1; i >= 0; i--) {
            var _reservation = reservationsById[enteredReservationIds[i]];
            html += 
                '<tr>'+
                    '<td>'+_reservation._id+'</td>'+
                    '<td>'+_reservation.ticket_type_name_ja+'</td>'+
                    '<td>'+((confirmedReservationIds.indexOf(_reservation._id) >= 0) ? "入場済み" : "入場中...")+'</td>'+
                '</tr>'
            ;
        }

        $('.results tbody').html(html);
    }

    // 入場フラグ送信タイマーをまわす
    addAdmission();




    // handle events by barcode reader.
    var chars = [];
    $(window).keypress(function(e) {
        // 新しい入力値
        if (chars.length === 0) {
            $('.process').text($('input[name="messageSearching"]').val());
            $('.result').html('');
        }

        // ASCIIとEnterのみ。なくても良いが。
        if (e.charCode || e.keyCode === 13 ) {
            if (e.keyCode === 13){
                var reservationId = chars.join('');
                chars = [];

                $('.process').text($('input[name="messagePleaseReadBarcode"]').val());
                // 入力終了で予約IDをチェック
                check(reservationId);
            } else {
                chars.push(String.fromCharCode(e.charCode));
            }
        }
    });

    // for debug
    // check('57b911a5b5d8f7180aeea8ed');
});
