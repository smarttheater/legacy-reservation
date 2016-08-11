String.prototype.splice = function(idx, str) { //※日時整形用(Stringのidx文字目にstrを差し込む)
    return (this.slice(0, idx) + str + this.slice(idx));
};

$(function(){
    var locale = $('input[name="locale"]').val();
    var documentFieldName = (locale === 'ja') ? 'name' : 'name_en';
    var performances = [];
    var conditions = {
        page: '1'
    };


    function showPerformances() {
        // 作品ごとに整形(APiのレスポンスは、上映日昇順)
        var filmIds = [];
        var performancesByFilm = {};
        performances.forEach(function(performance){
            var filmId = performance.film._id;
            if (filmIds.indexOf(filmId) < 0) {
                filmIds.push(filmId);
                performancesByFilm[filmId] = [];
            }

            performancesByFilm[filmId].push(performance);
        });




        var NAMETABLE_STATUS = { // CSSクラス分けのため変換
            '◎':'vacant',
            '○':'capable',
            '△':'crowded',
            '×':'soldout',
            '?':'unknown'
        };

        var html = '';

        filmIds.forEach(function(filmId) {
            var performancesOnFilm = performancesByFilm[filmId];
            var sections = performancesOnFilm[0].film.sections.map(function(section) {return section[documentFieldName];}); // 部門名
            var genres = performancesOnFilm[0].film.genres.map(function(genre) {return genre[documentFieldName];}); // ジャンル名

            html += 
                '<div class="performance accordion_mobile_toggle">'+
                    '<div class="performance-image"><img src="'+performancesOnFilm[0].film.image+'"></div>'+///images/temp_performance_thumb.jpg"></div>'+
                    '<div class="performance-title"><h3><span>'+performancesOnFilm[0].film[documentFieldName]+'</span></h3></div>'+
                    '<div class="performance-inner accordion_mobile_inner">'+
                        '<div class="performance-info">'+
                            '<div class="desc">' + sections.join(',') + '</div>'+
                            '<div class="genreslength">'+
                                '<div class="genres">'+
                                    '<span>' + genres.join('</span><span>') + '</span>' +
                                '</div>'+
                                '<span class="length">本編 102分</span>'+
                            '</div>'+
                        '</div>'+
                        '<div class="performance-schedule">'
            ;
            var scheduleClmCount = 0; //3列ごとにwrapperで括る
            performancesOnFilm.forEach(function(performance, index) {
                performance.day = performance.day.substr(4).splice(2,'/');//Ymdをm/dに
                performance.start_time = performance.start_time.splice(2,':');//hiをh:iに

                if(scheduleClmCount === 0){
                    html += '<div class="wrapper-scheduleitems">';
                }
                html += 
                                '<div class="scheduleitem scheduleitem-'+NAMETABLE_STATUS[performance.seat_status]+' select-performance" data-performance-id="'+performance._id+'">'+
                                    '<div class="text">'+ 
                                        '<h3>'+performance.day+' '+performance.start_time+' - </h3>'+
                                        '<p>'+performance.theater[documentFieldName]+performance.screen[documentFieldName]+'</p>'+
                                    '</div>'+
                                    '<span class="status">'+performance.seat_status+'</span>'+
                                '</div>'
                ;
                scheduleClmCount = scheduleClmCount + 1;
                if(scheduleClmCount === 3 || index === performancesOnFilm.length-1){
                    html += '</div>';
                    scheduleClmCount = 0;
                }
            });
            html += 
                        '</div>'+
                    '</div>'+
                '</div>'
            ;
        });


        $('.performances').html(html);
    }




    function showConditions() {
        var formDatas = $('form').serializeArray();
        formDatas.forEach(function(formData, index){
            var name = formData.name;
            if (conditions.hasOwnProperty(name)) {
                $('input[name="' + name + '"], select[name="' + name + '"]', $('form')).val(conditions[name]);
            } else {
                $('input[name="' + name + '"], select[name="' + name + '"]', $('form')).val('');
            }
        });
    }

    function search() {
        $.ajax({
            dataType: 'json',
            url: '/api/' + locale + '/performance/search',
            type: 'GET',
            data: conditions,
            beforeSend: function() {
                $('.loading').modal();
            },
            complete: function() {
                $('.loading').modal('hide');
            },
            success: function(data) {
                if (data.isSuccess) {
                    performances = data.results;

                    showPerformances();
                    showConditions();

                } else {
                }
            },
            error: function(jqxhr, textStatus, error) {
            }
        });
    }






    // 検索
    $(document).on('click', '.search', function(){
        conditions.page = '1';

        // 検索フォームの値を全て条件に追加
        var formDatas = $('form').serializeArray();
        formDatas.forEach(function(formData, index){
            conditions[formData.name] = formData.value;
        });

        search();
    });

    // セレクト変更イベント
    $(document).on('change', 'form select', function(){
        conditions.page = '1';

        // 検索フォームの値を全て条件に追加
        var formDatas = $('form').serializeArray();
        formDatas.forEach(function(formData, index){
            conditions[formData.name] = formData.value;
        });

        search();
    });

    // パフォーマンス選択
    $(document).on('click', '.select-performance', function(){
        $('input[name="performanceId"]').val($(this).attr('data-performance-id'));
        $('form').submit();
    });


    // パフォーマンスリスト表示
    $('.search').click();
});