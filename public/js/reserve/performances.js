/* global moment, flatpickr */
$(function () {
    'use strict';

    // カレンダーを何月何日から表示するか
    var CALENDER_MINDATE = 'today';
    // 一般購入の場合、予約可能なイベント開始日時と、現在日時の、大きい方
    CALENDER_MINDATE = moment.max([moment(window.ttts.reservableEventStartFrom), moment()]).format('YYYY-MM-DD');

    // カレンダーを何日先まで表示するか
    var CALENDER_MAXDATE = window.ttts.reservableMaxDate || '';

    // 空き状況表示切り替え閾値
    var STATUS_THRESHOLD = {
        CROWDED: 37,
        LAST: 9,
        WHEELCHAIR_SOLDOUT: 6
    };

    // performanceのstatusからCSSクラス名を得る
    var getItemClassNameByPerformance = function (performance) {
        if (performance.online_sales_status !== 'Normal') {
            return 'item-unavailable'; // 「-」
        }
        var num = parseInt(performance.seat_status, 10);
        if (window.ttts.isWheelchairReservation && (!performance.wheelchair_available || num < STATUS_THRESHOLD.WHEELCHAIR_SOLDOUT)) {
            return 'item-soldout';
        }
        if (num > STATUS_THRESHOLD.CROWDED) {
            return 'item-capable'; // 「⚪」
        } else if (num > STATUS_THRESHOLD.LAST) {
            return 'item-crowded'; // 「△」
        } else if (num > 0) {
            return 'item-last'; // 「人間アイコン + 残数」
        }
        return 'item-soldout'; // 「×」
    };

    // APIから得たパフォーマンス一覧を整形して表示
    var dom_performances = document.querySelector('.performances');
    var showPerformances = function (performanceArray) {
        // 1hごとにまとめる (start_timeの最初2文字を時間とする)
        var hourArray = [];
        var performancesByHour = {};

        performanceArray.forEach(function (performance) {
            try {
                var hour = performance.start_time.slice(0, 2);

                if (hourArray.indexOf(hour) === -1) {
                    hourArray.push(hour);
                    performancesByHour[hour] = [];
                }

                performancesByHour[hour].push(performance);
            } catch (e) {
                console.error(e);
            }
        });
        console.log('performancesByHour:', performancesByHour);

        // 時間割を念のためソート
        hourArray.sort(function (a, b) {
            if (a < b) { return -1; }
            if (a > b) { return 1; }
            return 0;
        });

        var html = '';
        hourArray.forEach(function (hour) {
            // 時間割内のパフォーマンスを念のためソート
            performancesByHour[hour].sort(function (a, b) {
                if (a.start_time < b.start_time) { return -1; }
                if (a.start_time === b.start_time) { return 0; }
                return 1;
            });

            html += '<div class="performance">' +
                '<div class="hour"><span>' + hour + ':00～</span></div>' +
                '<div class="items">';
            performancesByHour[hour].forEach(function (performance) {
                html += '<div class="item ' + getItemClassNameByPerformance(performance) + '" data-performance-id="' + performance.id + '">' +
                    '<p class="time">' + window.ttts.fn_spliceStr(performance.start_time, 2, ':') + ' - ' + window.ttts.fn_spliceStr(performance.end_time, 2, ':') + '</p>' +
                    '<div class="wrapper-status">' +
                    '<p class="status">' + performance.seat_status + '</p>' +
                    '</div>' +
                    '</div>';
            });
            html += '</div>' +
                '</div>';
        });
        dom_performances.innerHTML = html;
    };


    // 検索
    var $loading = $('.loading');
    var search = function (condition) {
        if (window.ttts.isWheelchairReservation) {
            condition.wheelchair = true;
        }
        $.ajax({
            dataType: 'json',
            url: '/api/performances',
            type: 'GET',
            data: condition,
            beforeSend: function (xhr) {
                $loading.modal();
            }
        }).done(function (body) {
            if ($.isArray(body)) {
                showPerformances(body);
            } else {
                dom_performances.innerHTML = '';
            }
        }).fail(function (jqxhr, textStatus, error) {
            console.log('API Error: /performance/search', error);
        }).always(function () {
            $loading.modal('hide');
        });
    };


    // 日付選択カレンダー (再読込時のために日付はsessionStorageにキープしておく)
    flatpickr.localize(window.flatpickr.l10ns[window.ttts.currentLocale]);
    var $modal_calender = $('.modal-calender');
    var calendar = new flatpickr(document.getElementById('input_performancedate'), {
        appendTo: $('#calendercontainer').on('click', function (e) { e.stopPropagation(); })[0], // モーダル内コンテナに挿入しつつカレンダークリックでモーダルが閉じるのを防止
        defaultDate: window.sessionStorage.getItem('performance_ymd') || CALENDER_MINDATE,
        disableMobile: true, // 端末自前の日付選択UIを使わない
        locale: window.ttts.currentLocale,
        minDate: CALENDER_MINDATE,
        maxDate: CALENDER_MAXDATE || new Date().fp_incr(60),
        onOpen: function () {
            $modal_calender.fadeIn(200);
        },
        onClose: function () {
            $modal_calender.hide();
        },
        // カレンダーの日付が変更されたら検索を実行
        onValueUpdate: function (selectedDates, dateStr) {
            window.ttts.setSessionStorage('performance_ymd', dateStr);
            search({
                page: 1,
                day: dateStr.replace(/\-/g, ''), // Y-m-dをYmdに整形
                noTotalCount: '1'
            });
        }
    });
    // モーダルを閉じたら中のカレンダーも閉じる
    $modal_calender.click(function () { calendar.close(); });


    // パフォーマンス決定
    $(document).on('click', '.item', function (e) {
        document.querySelector('input[name="performanceId"]').value = e.currentTarget.getAttribute('data-performance-id');
        document.getElementById('form_performanceId').submit();
    });
});
