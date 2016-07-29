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




        var html = '';

        for (var filmId of filmIds) {
            var performancesOnFilm = performancesByFilm[filmId];

            html += `
            <h3>
                ${performancesOnFilm[0].film[documentFieldName]}
            </h3>
            <div class="row">

                <div class="col-sm-2">
                    <img src="${performancesOnFilm[0].film.image}" alt="" class="img-thumbnail" style="width: 100px; height: 100px;">
                </div>
    `;


            performancesOnFilm.forEach(function(performance, index) {
                if (index % 3 === 0) {
                }

                html += `
                    <div class="col-sm-3">
                        <a href="javascript:void(0)" data-performance-id="${performance._id}" class="select-performance">
                            ${performance.day}<br>

                            ${performance.theater[documentFieldName]} ${performance.screen[documentFieldName]}<br>

                            ${performance.start_time}-${performance.end_time}<br>
                            ${performance.seat_status}

                        </a>
                    </div>
    `;

            });

                html += `
            </div>
    `;
        }


        $('.performances').html(html);
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
            url: `/api/${locale}/performance/search`,
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





    // パフォーマンスリスト表示
    search();

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
});