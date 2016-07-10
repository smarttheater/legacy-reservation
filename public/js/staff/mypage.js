// 予約番号ごとにまとめた予約ドキュメントリスト
var reservationDocuments = [];
var conditions = {
    page: '1'
};

function showReservations() {
    var html = '';

    reservationDocuments.forEach((reservationDocument, index) => {
        html += `
        <tr data-payment-no="${reservationDocument.payment_no}"
            data-seat-code="${reservationDocument.seat_code}"
            data-reservation-id="${reservationDocument._id}">
            <td>
                <div class="checkbox">
                    <label>
                        <input type="checkbox" value="${reservationDocument.payment_no}">
                    </label>
                </div>
            </td>
            <td>${reservationDocument.payment_no}</td>
            <td>${reservationDocument.film_name_en}</td>
            <td>
                ${reservationDocument.performance_day} ${reservationDocument.performance_start_time}～
                ${reservationDocument.theater_name_en} ${reservationDocument.screen_name_en}
            </td>
            <td>
                <a class="show-seat-position" href="javascript:void(0);"
                    data-screen-id="${reservationDocument.screen._id}"
                    data-payment-no="${reservationDocument.payment_no}"
                    data-seat-code="${reservationDocument.seat_code}">${reservationDocument.seat_code}</a></td>
            <td>${reservationDocument.staff_signature}</td>
            <td>
                <div class="col-md-6">
                    <input type="text" class="form-control" value="${reservationDocument.watcher_name}">
                </div>
                <div class="col-md-6">
                    <a class="btn btn-primary update-watcher-name" href="javascript:void(0)"
                        data-payment-no="${reservationDocument.payment_no}"
                        data-reservation-id="${reservationDocument._id}">Update</a>
                </div>
            </td>
            <td><a class="btn btn-primary" href="javascript:void(0)">Print</a></td>
            <td>
                <a class="btn btn-primary confirm-cancel" href="javascript:void(0)">Cancel</a>
            </td>
        </tr>
`;
    });

    $('table.reservations tbody').html(html);
}

function showPager(count) {
    var html = '';

    html += `
<nav>
    <ul class="pagination">
`;

    if (conditions.page > 1) {
        html += `
        <li>
            <a href="javascript:void(0)" aria-label="Previous" class="change-page" data-page="1">
                <span aria-hidden="true">&laquo;</span>
            </a>
        </li>
`;
    }

    pages = Math.ceil(count / 2);

    for (var i=0; i<pages; i++) {
        if (parseInt(conditions.page) === i + 1) {
    html += `
        <li class="active"><a href="javascript:void(0)">${i + 1}</a></li>
`;

        } else {
    html += `
        <li><a href="javascript:void(0)" class="change-page" data-page="${i + 1}">${i + 1}</a></li>
`;

        }
    }

    if (parseInt(conditions.page) < pages) {
        html += `
        <li>
            <a href="javascript:void(0)" aria-label="Next" class="change-page" data-page="${pages}">
                <span aria-hidden="true">&raquo;</span>
            </a>
        </li>
`;
    }

    html += `
    </ul>
</nav>
`;

    $('.pager-section').html(html);
}

function showConditions() {
    var formDatas = $('form').serializeArray();
    formDatas.forEach(function(formData, index){
        var name = formData.name;
        if (conditions.hasOwnProperty(name)) {
            $(`input[name="${name}"], select[name="${name}"]`, $('form')).val(conditions[name]);
        } else {
            $(`input[name="${name}"], select[name="${name}"]`, $('form')).val('');
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

        } else {
        }
    }).fail(function(jqxhr, textStatus, error) {
    }).always(function() {
        $('.loading').modal('hide');
    });
}

$(function(){
    // 予約リスト表示
    search();

    $(document).on('click', '.search', function(){
        conditions.page = '1';

        // 検索フォームの値を全て条件に追加
        var formDatas = $('form').serializeArray();
        formDatas.forEach(function(formData, index){
            conditions[formData.name] = formData.value;
        });

        search();
    });

    $(document).on('click', '.change-page', function(){
        conditions.page = $(this).attr('data-page');
        search();
    });

    // キャンセルしようとしている予約リスト
    var reservations4cancel = [];
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


    $(document).on('click', '.action-to-reservations', function(){
        var action = $('select', $(this).parent()).val();

        if (action === 'cancel') {
            reservations4cancel = [];
            var _seatCodes = [];

            // チェック予約リストを取得
            $('td input[type="checkbox"]:checked').map(function(){
                var trNode = $(this).parent().parent().parent().parent();
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


    $(document).on('click', '.check-all input[type="checkbox"]', function(){
        $('td input[type="checkbox"]').prop('checked', $(this).is(':checked'));
    });
})