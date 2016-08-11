$(function(){
    // 予約番号ごとにまとめた予約ドキュメントリスト
    var reservationDocuments = [];
    var conditions = {
        page: '1'
    };

    function showReservations() {
        var html = '';

        reservationDocuments.forEach(function(reservationDocument) {
            html += ''
            + '<tr data-payment-no="' + reservationDocument.payment_no + '"'
                + 'data-seat-code="' + reservationDocument.seat_code + '"'
                + 'data-reservation-id="' + reservationDocument._id + '">'
                + '<th class="td-checkbox"><input type="checkbox" value="' + reservationDocument.payment_no + '"></th>'
                + '<td class="td-number">' + reservationDocument.payment_no + '</td>'
                + '<td class="td-title">'
                    + '' + reservationDocument.film_name_en + '<br>'
                    + '' + reservationDocument.performance_day + ' ' + reservationDocument.performance_start_time + ' ～<br>'
                    + '' + reservationDocument.theater_name_en + ' ' + reservationDocument.screen_name_en + ''
                + '</td>'
                + '<td class="td-seat"><a href="javascript:void(0);" class="show-seat-position" data-screen-id="' + reservationDocument.screen.toString() + '" data-seat-codes="' + reservationDocument.seat_code + '">' + reservationDocument.seat_code + '</a></td>'
                + '<td class="td-updater">' + reservationDocument.staff_signature + '</td>'
                + '<td class="td-distribution form-inline">'
                    + '<div class="form-group">'
                        + '<input class="form-control" type="text" value="' + reservationDocument.watcher_name + '">'
                    + '</div>'
                    + '<div class="form-group">'
                        + '<p class="btn update-watcher-name" data-reservation-id="' + reservationDocument._id + '"><span>Update</span></p>'
                    + '</div>'
                + '</td>'
                + '<td class="td-actions">'
                    + '<p class="btn confirm-cancel"><span>Cancel</span></p>'
                    + '<p class="btn"><span>Print</span></p>'
                + '</td>'
            + '</tr>';
        });

        $('#reservations').html(html);
    }

    /**
     * ページャーを表示する
     * 
     * @param {number} count ページあたりの件数
     */
    function showPager(count) {
        var html = '';

        if (conditions.page > 1) {
            html += ''
            + '<span><a href="javascript:void(0)" class="change-page" data-page="1">&lt;</a></span>'
            + '<span><a href="javascript:void(0)" class="change-page" data-page="1">最初</a></span>'
            ;
        }

        pages = Math.ceil(count / 2);

        for (var i=0; i<pages; i++) {
            var _page = i + 1;
            if (parseInt(conditions.page) === i + 1) {
                html += '<span>' + _page + '</span>';
            } else {
                html += '<span><a href="javascript:void(0)" class="change-page" data-page="' + _page + '">' + _page + '</a></span>';
            }
        }

        if (parseInt(conditions.page) < pages) {
            html += ''
            + '<span><a href="javascript:void(0)" class="change-page" data-page="' + pages + '">最後</a></span>'
            + '<span><a href="javascript:void(0)" class="change-page" data-page="' + pages + '">&gt;</a></span>';
        }

        $('.navigation').html(html);
    }

    function showConditions() {
        var formDatas = $('.search-form').serializeArray();
        formDatas.forEach(function(formData, index){
            var name = formData.name;
            if (conditions.hasOwnProperty(name)) {
                $(`input[name="${name}"], select[name="${name}"]`, $('.search-form')).val(conditions[name]);
            } else {
                $(`input[name="${name}"], select[name="${name}"]`, $('.search-form')).val('');
            }
        });
    }

    function search() {
        $.ajax({
            dataType: 'json',
            url: $('input[name="urlSearch"]').val(),
            type: 'GET',
            data: conditions,
            beforeSend: function() {
                $('.loading').modal();
            }
        }).done(function(data) {
            if (data.isSuccess) {
                reservationDocuments = data.results;

                showReservations();
                showPager(parseInt(data.count));
                showConditions();
                $('.total-count').text(data.count);

            } else {
            }
        }).fail(function(jqxhr, textStatus, error) {
        }).always(function() {
            $('.loading').modal('hide');
        });
    }

    // 検索
    $(document).on('click', '.search', function(){
        conditions.page = '1';

        // 検索フォームの値を全て条件に追加
        var formDatas = $('.search-form').serializeArray();
        formDatas.forEach(function(formData, index){
            conditions[formData.name] = formData.value;
        });

        search();
    });

    // ページ変更
    $(document).on('click', '.change-page', function(){
        conditions.page = $(this).attr('data-page');
        search();
    });

    // キャンセルしようとしている予約リスト
    var reservations4cancel = [];

    // キャンセル確認
    $(document).on('click', '.confirm-cancel', function(){
        var reservationId = $(this).parent().parent().attr('data-reservation-id');
        var paymentNo = $(this).parent().parent().attr('data-payment-no');
        var seatCode = $(this).parent().parent().attr('data-seat-code');

        reservations4cancel = [];
        reservations4cancel.push({
            id: reservationId,
            paymentNo: paymentNo,
            seatCode: seatCode
        });

        $('.cancel-reservation-confirm .modal-body').html(`Are you sure you cancel '${seatCode}'?`);
        $('.cancel-reservation-confirm').modal();
    });

    // キャンセル実行
    $(document).on('click', '.execute-cancel', function(){
        var _reservationIds = [];
        reservations4cancel.forEach(function(reservation){
            _reservationIds.push(reservation.id);
        });

        $.ajax({
            dataType: 'json',
            url: $('input[name="urlCancel"]').val(),
            type: 'POST',
            data: {
                reservationIds: JSON.stringify(_reservationIds)
            },
            beforeSend: function() {
                $('.cancel-reservation-confirm').modal('hide');
            }
        }).done(function(data) {
            if (data.isSuccess) {
                // 再検索
                search();

                $('.cancel-reservation-complete').modal();
            } else {
                alert('Failed canceling.');
            }
        }).fail(function(jqxhr, textStatus, error) {
        }).always(function() {
        });
    });

    // 配布先更新
    $(document).on('click', '.update-watcher-name', function(){
        var paymentNo = $(this).attr('data-payment-no');
        var reservationId = $(this).attr('data-reservation-id');
        var watcherName = $('input', $(this).parent().parent()).val();

        $.ajax({
            dataType: 'json',
            url: $('input[name="urlUpdateWatcherName"]').val(),
            type: 'POST',
            data: {
                reservationId: reservationId,
                watcherName: watcherName,
            },
            beforeSend: function() {
            }
        }).done(function(data) {
            if (data.isSuccess) {
                // 再検索
                search();

                // TODO 再検索しなくてもいいはず？
                // reservationDocumentsByPaymentNo[paymentNo][reservationId]['watcher_name'] = data.reservation.watcher_name;
                // reservationDocumentsByPaymentNo[paymentNo][reservationId]['staff_signature'] = data.reservation.staff_signature;
                // showReservations();

            } else {
                alert('Failed Updating.');
            }
        }).fail(function(jqxhr, textStatus, error) {
        }).always(function() {
        });
    });

    // まとめて操作
    $(document).on('click', '.action-to-reservations', function(){
        var action = $('select[name="action"]').val();

        if (action === 'cancel') {
            reservations4cancel = [];
            var _seatCodes = [];

            // チェック予約リストを取得
            $('.td-checkbox input[type="checkbox"]:checked').map(function(){
                var trNode = $(this).parent().parent();
                var reservationId = trNode.attr('data-reservation-id');
                var paymentNo = trNode.attr('data-payment-no');
                var seatCode = trNode.attr('data-seat-code');

                if (reservationId) {
                    reservations4cancel.push({
                        id: reservationId,
                        paymentNo: paymentNo,
                        seatCode: seatCode
                    });

                    _seatCodes.push(seatCode);
                }
            });

            if (reservations4cancel.length < 1) {
                alert('Select reservations.');
            } else {
                // 確認モーダル表示
                $('.cancel-reservation-confirm .modal-body').html(`Are you sure you cancel '${_seatCodes.join('、')}'?`);
                $('.cancel-reservation-confirm').modal();
            }

        } else if (action === 'print') {

            alert('未実装です');
        } else {
            alert('操作を選択してください');
        }
    });

    // 全てチェックする
    $(document).on('click', '.check-all', function(){
        $('.td-checkbox input[type="checkbox"]').prop('checked', $(this).is(':checked'));
    });

    // 予約リスト表示
    search();
});
