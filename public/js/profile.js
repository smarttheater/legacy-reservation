/* global Multipayment */
$(function() {
    var is_customer = !!document.querySelector('table-profile-customer');

    // セッションに入ってた入力値
    var local_address = document.getElementById('local_address').value || '';
    var local_tel = document.getElementById('local_tel').value || '';

    // 国選択兼電話番号入力欄 ( https://github.com/jackocnr/intl-tel-input )
    var $input_tel = $('#id_tel');
    var $input_tel_otherregion = $('#input_tel_otherregion');
    var setCountry = function(val) {
        document.getElementById('input_country').value = (val || $input_tel.intlTelInput('getSelectedCountryData').iso2 || local_address || '').toUpperCase();
    };
    // Staffでは国選択不要なのでロードしない
    if ($.fn.intlTelInput) {
        $.fn.intlTelInput.loadUtils('/js/lib/intl-tel-input/utils.js');
        // 言語別ごとで表示順位を上げる国を設定する
        var preferredCountries = document.getElementById('preferred_countries').value || '';
        preferredCountries = (preferredCountries) ? JSON.parse(preferredCountries) : ['jp', 'tw', 'cn', 'kr', 'us', 'fr', 'de', 'it', 'es', 'vn', 'id', 'th', 'ru'];
        $input_tel.intlTelInput({
            preferredCountries: preferredCountries,
            // 数字のみで入力してもらうのでデフォルトのプレースホルダを書き換え
            customPlaceholder: function(selectedCountryPlaceholder) {
                return selectedCountryPlaceholder.replace(/[^0-9]/g, '');
            }
        });

        // intl-TelInputのサポート外地域(チベットなど)をカバー
        $('#checkbox_otherregion').on('change', function(e) {
            // "Other Area"にチェックが入ったら使うinput[name=tel]を入れ替える
            if (e.target.checked) {
                $input_tel[0].disabled = true;
                $input_tel_otherregion[0].disabled = false;
                $('#wrapper_tel_otherregion').fadeIn(200);
                $input_tel.removeClass('input-required');
                $input_tel_otherregion.addClass('input-required');
                setCountry('XX'); // *The code XX is being used as an indicator for unknown states, other entities or organizations.
            } else {
                $input_tel[0].disabled = false;
                $input_tel_otherregion[0].disabled = true;
                $('#wrapper_tel_otherregion').fadeOut(200);
                $input_tel.addClass('input-required');
                $input_tel_otherregion.removeClass('input-required');
                setCountry();
            }
            $input_tel[0].value = ($input_tel[0].value || '').replace(/\-\+/g, '');
            $input_tel_otherregion[0].value = ($input_tel_otherregion[0].value || '').replace(/\-\+/g, '');
        });

        // セッションの値があったら適用する
        if (local_address && local_address !== 'XX') {
            $input_tel.intlTelInput('setCountry', local_address.toLowerCase());
        }
        if (local_tel) {
            $('#checkbox_otherregion').prop('checked', (local_address === 'XX')).trigger('change');
        }
    } else if (!is_customer) {
        alert('failed to load intl-tel-input');
    }


    // メールアドレスの確認欄2つを結合してhiddenのinputに保存
    var input_email = document.getElementById('id_email');        
    var input_emailconfirmconcat = document.getElementById('input_emailconfirmconcat');
    var input_emailConfirm = document.getElementById('id_emailConfirm');    
    var input_emailConfirmDomain = document.getElementById('id_emailConfirmDomain');
    var setEmailConfirm = function() {
        if (!input_email || !input_emailconfirmconcat) { return false; }        
        var val = input_emailConfirm.value + '@' +input_emailConfirmDomain.value;
        input_emailconfirmconcat.value = (input_email.value === val) ? val : '!';
    }

    // カード有効期限のYYYYとMMのセレクト要素の値を結合してhiddenのinputに保存
    var input_expire = document.getElementById('expire');
    var select_cardExpirationYear = document.getElementById('cardExpirationYear');    
    var select_cardExpirationMonth = document.getElementById('cardExpirationMonth');
    var setExpiredate = function() {
        if (!input_expire || !select_cardExpirationYear || !select_cardExpirationMonth) { return false; }
        var val = select_cardExpirationYear.value + select_cardExpirationMonth.value;
        input_expire.value = (val.length === 'YYYYMM'.length) ? val : '';
    }

    
    /*
        バリデーション
    */
    // 置換用エラー文言
    var errmsgTemplate = {
        empty: document.getElementById('locale_errmsg_empty').value,
        invalid: document.getElementById('locale_errmsg_invalid').value,
        maxLength: document.getElementById('locale_errmsg_maxLength').value
    };
    // トークン取得前にバリデーション
    var validateCreditCardInputs = function() {
        var bool_valid = true;
        Array.prototype.forEach.call(document.getElementsByClassName('input-required'), function(elm) {
            var error = null;            
            var parentSelector = elm.getAttribute('data-parentSelector') || '.tr-' + elm.name;
            var elm_parent = document.querySelector(parentSelector);
            var elm_errmsg = document.querySelector('.errmsg-' + elm.name);
            var filedname = elm.getAttribute('data-fieldname');
            var maxLength = elm.getAttribute('maxLength') || null;
            var regex = elm.getAttribute('data-pattern') || '';
            regex = (regex) ? new RegExp(regex) : '';
            // 電話番号についてはintlTelInputに投げる
            if (elm.id === 'id_tel' && (!$input_tel.intlTelInput('isValidNumber'))) {
                error = 'invalid';
            } else if (!elm.value) {
                error = 'empty';
            } else if (maxLength && !elm.value.length > maxLength) {
                error = 'maxLength';
            } else if (regex && !regex.test(elm.value)) {
                error = 'invalid';
            }
            if (error) {
                elm_parent.classList.add('has-error');
                elm_errmsg.innerText = errmsgTemplate[error].replace('{{fieldName}}', filedname).replace('{{max}}', maxLength);
                bool_valid = false;
            } else {
                elm_parent.classList.remove('has-error');
                elm_errmsg.innerText = '';
            }
        });
        return bool_valid;
    };


    // 送信
    $('.btn-next').on('click', function() {
        var paymentMethod = $('input[name=paymentMethod]:checked').val();
        if (paymentMethod === '0') {
            setEmailConfirm();
            setCountry();
            setExpiredate();
            if (!validateCreditCardInputs()) {
                return document.querySelector('.has-error').scrollIntoView();
            }
            getToken();
        } else {
            $('form').submit();
        }
    });
});

/**
 * トークン取得後イベント
 * @function someCallbackFunction
 * @param {Object} response
 * @param {Object} response.tokenObject
 * @param {number} response.resultCode
 * @returns {void}
 */
function someCallbackFunction(response) {
    // カード情報は念のため値を除去
    $('input[name=cardNumber]').val('');
    $('select[name=cardExpirationYear]').val('');
    $('select[name=cardExpirationMonth]').val('');
    $('input[name=securitycode]').val('');
    $('input[name=holdername]').val('');
    if (response.resultCode !== '000') {
        var errormsgByLocale = document.getElementById('locale_errmsg_cardtoken').value;
        alert(errormsgByLocale || 'Credit Card Error.');
    } else {
        // 予め購入フォームに用意した token フィールドに、値を設定
        $('input[name=gmoTokenObject]').val(JSON.stringify(response.tokenObject));
        // スクリプトからフォームを submit
        $('form').submit();
    }
}

/**
 * トークン取得
 * @function getToken
 * @returns {void}
 */
function getToken() {
    var cardno = $('input[name=cardNumber]').val();
    var expire = $('select[name=cardExpirationYear]').val() + $('select[name=cardExpirationMonth]').val();
    var securitycode = $('input[name=securitycode]').val();
    var holdername = $('input[name=holdername]').val();
    var sendParam = {
        cardno: cardno, // 加盟店様の購入フォームから取得したカード番号
        expire: expire, // 加盟店様の購入フォームから取得したカード有効期限
        securitycode: securitycode, // 加盟店様の購入フォームから取得したセキュリティコード
        holdername: holdername // 加盟店様の購入フォームから取得したカード名義人
    };

    Multipayment.getToken(sendParam, someCallbackFunction);
}
