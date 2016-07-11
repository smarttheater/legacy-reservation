$(function(){
    $(document).on('click', '.send-mail', function(){
        var id = $(this).attr('data-reservation-id');
        var url = $(this).attr('data-url');

        $.ajax({
            dataType: 'json',
            url: url,
            type: 'POST',
            data: {
                id: id
            },
            beforeSend: function() {
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