$(function(){
    var url4transfering = '';
    var reservationID4transfering = '';

    $(document).on('click', '.send-mail', function(){
        url4transfering = $(this).attr('data-url');
        reservationID4transfering = $(this).attr('data-reservation-id');

        $('.transfering .errmsg').text('');
        $('.transfering input[name="email"]').val('');
        $('.transfering').modal('show');
    });

    $(document).on('click', '.execute-transfer', function(){
        var to = $('.transfering input[name="email"]').val();
        if (!to) {
            $('.transfering .errmsg').text('メールアドレスを入力してください');
            return;
        }

        $.ajax({
            dataType: 'json',
            url: url4transfering,
            type: 'POST',
            data: {
                id: reservationID4transfering,
                to: to
            },
            beforeSend: function() {
                $('.transfering').modal('hide');
                $('.loading .modal-body .text-center').hide();
                $('.loading .modal-body .text-center.sending').show();
                $('.loading').modal();
            }
        }).done(function(data) {

            if (data.success) {
                $('.loading .modal-body .text-center').hide();
                $('.loading .modal-body .text-center.sent').show();
                $('.loading').modal();
            } else {
                $('.loading').modal('hide');

                // TODO 動き調整
                setTimeout(function() {
                    $('.transfering .errmsg').text(data.message);
                    $('.transfering').modal();
                }, 500);
                // $('.loading .modal-body .text-center.unsent').show();
            }
        }).fail(function(jqxhr, textStatus, error) {

        }).always(function(data) {

        });
    });
})