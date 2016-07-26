$(function(){
    var url4transfering = '';
    var reservationID4transfering = '';

    $(document).on('click', '.send-mail', function(){
        url4transfering = $(this).attr('data-url');
        reservationID4transfering = $(this).attr('data-reservation-id');

        $('.transfering input[name="email"]').val('');
        $('.transfering').modal();
    });

    $(document).on('click', '.execute-transfer', function(){
        var to = $('.transfering input[name="email"]').val();
        if (!to) {
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
            $('.loading .modal-body .text-center').hide();

            if (data.isSuccess) {
                $('.loading .modal-body .text-center.sent').show();
            } else {
                $('.loading .modal-body .text-center.unsent').show();
            }

            $('.loading').modal();

        }).fail(function(jqxhr, textStatus, error) {

        }).always(function(data) {

        });
    });
})