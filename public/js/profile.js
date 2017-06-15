var input_cardNumber = document.querySelector('input[name=cardNumber]');
var select_cardExpirationYear = document.querySelector('select[name=cardExpirationYear]');
var select_cardExpirationMonth = document.querySelector('select[name=cardExpirationMonth]');
var input_holdername = document.querySelector('input[name=holdername]');
var input_securitycode = document.querySelector('input[name=securitycode]');
var input_gmoTokenObject = document.querySelector('input[name=gmoTokenObject]');
var form_profile = document.getElementById('form_profile');

/**
 * トークン取得実行後コールバック
 * @function someCallbackFunction
 * @param {Object} response
 * @param {Object} response.tokenObject
 * @param {number} response.resultCode
 * @returns {void}
 */
function someCallbackFunction(response) {
    // カード情報は念のため値を除去
    var date = new Date();
    input_cardNumber.value = '';
    select_cardExpirationYear.value = (String(date.getFullYear()));
    select_cardExpirationMonth.value = (date.getMonth() + 1 < 10) ? '0' + String(date.getMonth() + 1) : String(date.getMonth() + 1);
    input_securitycode.value = '';
    input_holdername.value = '';
    if (response.resultCode !== '000') {
        alert('トークン取得エラー');
    } else {
        // 予め購入フォームに用意した token フィールドに、値を設定
        input_gmoTokenObject.value = JSON.stringify(response.tokenObject);
        // スクリプトからフォームを submit
        form_profile.submit();
    }
}

/**
 * トークン取得実行
 * @function getToken
 * @returns {void}
 */
function getToken() {
    var cardno = input_cardNumber.value;
    var expire = select_cardExpirationYear.value + select_cardExpirationMonth.value;
    var securitycode = input_securitycode.value;
    var holdername = input_holdername.value;
    var sendParam = {
        cardno: cardno, // 加盟店様の購入フォームから取得したカード番号
        expire: expire, // 加盟店様の購入フォームから取得したカード有効期限
        securitycode: securitycode, // 加盟店様の購入フォームから取得したセキュリティコード
        holdername: holdername // 加盟店様の購入フォームから取得したカード名義人
    };
    window.Multipayment.getToken(sendParam, someCallbackFunction);
}


$(function() {
    document.querySelector('.btn-next').onclick = getToken;
});
