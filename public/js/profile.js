/* global Multipayment */
$(function() {
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
            if (!elm.value) {
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

    $('.btn-next').on('click', function() {
        var paymentMethod = $('input[name=paymentMethod]:checked').val();
        if (paymentMethod === '0') {
            setEmailConfirm();
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
