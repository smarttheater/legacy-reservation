$(function(){
    var locale = $('html').attr('lang');

    // 券種変更イベント
    $(document).on('change', 'select', function(){
        reloadTotalCharge();
    });

    // 次へ
    $(document).on('click', '.btn-next', function(){
        $('form input[name="choices"]').val('');
        // 座席コードリストを取得
        var choices = [];
        $('.table-tickets tbody tr').each(function(){
            var ticketCount = $('option:selected', this).val(); 
            if (ticketCount > 0) {
                choices.push({
                    ticket_type: $(this).attr('data-ticket-code'),
                    ticket_count: ticketCount,
                    watcher_name: $('input', this).val()
                });
            }
        });
        if (choices.length > 0){
            $('form input[name="choices"]').val(JSON.stringify(choices));
        }
        $(this).attr('disabled',true);
        $('form').submit();
    });

    /**
     * 合計金額を再表示する
     */
    function reloadTotalCharge() {
        $('tfoot').addClass('hidden');

        var total = 0;
        $('.table-tickets tbody tr').each(function(){
            var charge = parseInt($(this).attr('data-ticket-charge'));
            var count = parseInt($('option:selected', this).val());
            total += charge * count;
        });
        if (total === 0) return;

        // 数字をコンマ区切りに
        var text = total.toString().replace(/(\d)(?=(\d{3})+$)/g , '$1,') + ((locale === 'ja') ? '円' : 'yen');
        $('.price').text(text);
        $('tfoot').removeClass('hidden');
    }

    // 合計金額初期表示
    reloadTotalCharge();
});