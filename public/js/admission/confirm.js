$(function(){
    /** 全予約リスト */
    var reservationsById = JSON.parse($('input[name="reservationsById"]').val());
    /** 全予約IDリスト */
    var reservationIds = Object.keys(reservationsById);
    /** 入場チェック済み予約IDリスト */
    var checkedReservationIds = [];
    /** 入場中予約リスト */
    var enteringReservations = [];
    /** 入場処理済み予約IDリスト */
    var enteredReservationIds = [];
    var audioYes = new Audio('/audio/yes01.mp3');
    var audioNo = new Audio('/audio/no01.mp3');

    /**
     * 予約IDをチェックする
     * 
     * @param {strnig} reservationId 予約ID
     */
    function check(reservationId) {
        if (!reservationId) {
            return false;
        }

        var message = '';

        // 予約データが存在する場合
        if (reservationIds.indexOf(reservationId) >= 0) {
            var _reservation = reservationsById[reservationId];

            // 入場済みの場合
            if (_reservation.entered) {
                message = _reservation.seat_code+' ['+_reservation.ticket_type_name_ja+'] 入場済み';
            } else {
                message = _reservation.seat_code+' ['+_reservation.ticket_type_name_ja+'] OK';

                // add to list for admission.
                if (checkedReservationIds.indexOf(reservationId) < 0) {
                    checkedReservationIds.push(reservationId);
                    enteringReservations.push({
                        _id: reservationId,
                        entered_at: Date.now()
                    });

                    updateResults();
                }
            }


            // 02,03は学生
            if (_reservation.ticket_type === '02' || _reservation.ticket_type === '03') {
                audioYes.load();
                audioYes.play();

                $('.result').html(
                    '<div class="alert confirmresult confirmresult-ok-student" role="alert">'+
                        '<span class="inner">'+
                            '<span class="glyphicon glyphicon glyphicon-ok-sign" aria-hidden="true"></span>' + message +
                        '</span>'+
                    '</div>'
                );
            } else {
                if (_reservation.entered) {
                    audioYes.load();
                    audioYes.play();
                } else {
                    audioYes.load();
                    audioYes.play();
                }

                $('.result').html(
                    '<div class="alert confirmresult confirmresult-ok" role="alert">'+
                        '<span class="inner">'+
                            '<span class="glyphicon glyphicon glyphicon-ok-sign" aria-hidden="true"></span>' + message +
                        '</span>'+
                    '</div>'
                );
            }

        // NG
        } else {
            audioNo.load();
            audioNo.play();

            message = 'NG';

            $('.result').html(
                '<div class="alert confirmresult confirmresult-ng" role="alert">'+
                    '<span class="inner">'+
                        '<span class="glyphicon glyphicon-remove-sign" aria-hidden="true"></span>' + message +
                    '</span>'+
                '</div>'
            );
        }
    }

    /**
    * 入場フラグを送信する
    */
    function processEnter() {
        if (enteringReservations.length < 1) {
            setTimeout(function(){
                processEnter();
            },2000);

        } else {
            var enteringReservation = enteringReservations[0];
            var id = enteringReservation._id;
            $.ajax({
                dataType: 'json',
                url: '/api/reservation/' + id + '/enter',
                type: 'POST',
                data: {
                    entered_at: enteringReservation.entered_at
                },
                beforeSend: function() {
                }
            }).done(function(data) {
                if (data.success) {
                    console.log('entered. reservationId', id);
                    enteringReservations.splice(0, 1);
                    enteredReservationIds.push(id);
                    reservationsById[id].entered = true;
                }
            }).fail(function(jqxhr, textStatus, error) {

            }).always(function() {
                updateResults();
                processEnter();
            });
        }
    }

    /**
     * 入場結果リストを更新する
     */
    function updateResults() {
        var html = ''

        for (var i = checkedReservationIds.length - 1; i >= 0; i--) {
            var _reservation = reservationsById[checkedReservationIds[i]];
            html += 
                '<tr>'+
                    '<td>'+_reservation._id+'</td>'+
                    '<td>'+_reservation.ticket_type_name_ja+'</td>'+
                    '<td>'+((enteredReservationIds.indexOf(_reservation._id) >= 0) ? "入場済み" : "入場中...")+'</td>'+
                '</tr>'
            ;
        }

        $('.results tbody').html(html);
    }

    // 入場フラグ送信タイマーをまわす
    processEnter();




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
    // check('57c14ae02045267022ea4759');
});
