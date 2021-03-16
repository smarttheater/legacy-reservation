"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancel = exports.result = exports.search = void 0;
/**
 * 注文照会コントローラー
 */
const cinerinoapi = require("@cinerino/sdk");
const http_status_1 = require("http-status");
const moment = require("moment-timezone");
const numeral = require("numeral");
const ticket = require("../util/ticket");
const order_1 = require("./order");
// キャンセル料(1注文あたり1000円固定)
const CANCEL_CHARGE = 1000;
const authClient = new cinerinoapi.auth.ClientCredentials({
    domain: process.env.API_AUTHORIZE_SERVER_DOMAIN,
    clientId: process.env.API_CLIENT_ID,
    clientSecret: process.env.API_CLIENT_SECRET,
    scopes: [],
    state: ''
});
const returnOrderTransactionService = new cinerinoapi.service.transaction.ReturnOrder({
    endpoint: process.env.CINERINO_API_ENDPOINT,
    auth: authClient,
    project: { id: process.env.PROJECT_ID }
});
const orderService = new cinerinoapi.service.Order({
    endpoint: process.env.CINERINO_API_ENDPOINT,
    auth: authClient,
    project: { id: process.env.PROJECT_ID }
});
/**
 * 注文照会
 */
function search(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        let message = '';
        let errors = null;
        // 照会結果セッション初期化
        delete req.session.inquiryResult;
        if (req.method === 'POST') {
            validate(req);
            const validatorResult = yield req.getValidationResult();
            errors = validatorResult.mapped();
            // 日付編集
            let performanceDay = req.body.day;
            performanceDay = performanceDay.replace(/\-/g, '').replace(/\//g, '');
            if (validatorResult.isEmpty()) {
                try {
                    const confirmationNumber = `${performanceDay}${req.body.paymentNo}`;
                    const confirmationPass = String(req.body.purchaserTel);
                    // 識別子で注文検索
                    const searchOrdersResult = yield orderService.findByIdentifier({
                        limit: 1,
                        identifier: {
                            $all: [
                                { name: 'confirmationNumber', value: confirmationNumber },
                                { name: 'confirmationPass', value: confirmationPass }
                            ]
                        }
                    });
                    const order = searchOrdersResult.data.shift();
                    // 返品済であれば入力ミス
                    if (order === undefined || order.orderStatus === cinerinoapi.factory.orderStatus.OrderReturned) {
                        throw new Error(req.__('MistakeInput'));
                    }
                    // 注文承認
                    let code;
                    try {
                        const authorizeOrderResult = yield orderService.authorize({
                            object: {
                                orderNumber: order.orderNumber,
                                customer: { telephone: order.customer.telephone }
                            },
                            result: { expiresInSeconds: order_1.CODE_EXPIRES_IN_SECONDS }
                        });
                        code = authorizeOrderResult.code;
                    }
                    catch (error) {
                        // tslint:disable-next-line:no-console
                        console.error(error);
                    }
                    // 結果をセッションに保管して結果画面へ遷移
                    req.session.inquiryResult = {
                        code: code,
                        order: order
                    };
                    res.redirect('/inquiry/search/result');
                    return;
                }
                catch (error) {
                    // tslint:disable-next-line:prefer-conditional-expression
                    if (!(error instanceof cinerinoapi.factory.errors.NotFound)) {
                        message = req.__('MistakeInput');
                    }
                    else {
                        message = error.message;
                    }
                }
            }
        }
        const maxDate = moment();
        Object.keys(order_1.reserveMaxDateInfo).forEach((key) => {
            maxDate.add(order_1.reserveMaxDateInfo[key], key);
        });
        const reserveMaxDate = maxDate.format('YYYY/MM/DD');
        // 注文照会画面描画
        res.render('inquiry/search', {
            message: message,
            errors: errors,
            reserveMaxDate: reserveMaxDate,
            layout: 'layouts/inquiry/layout',
            pageId: 'page_inquiry_search',
            pageClassName: `page-inquiry page-search page-${req.locale}`
        });
    });
}
exports.search = search;
/**
 * 注文照会結果画面(getのみ)
 */
function result(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const inquiryResult = req.session.inquiryResult;
            if (inquiryResult === undefined) {
                throw new Error(req.__('NotFound'));
            }
            const reservations = inquiryResult.order.acceptedOffers.map((o) => {
                const unitPrice = ticket.getUnitPriceByAcceptedOffer(o);
                return Object.assign(Object.assign({}, o.itemOffered), { unitPrice: unitPrice });
            })
                .sort((a, b) => (a.reservedTicket.ticketType.identifier < b.reservedTicket.ticketType.identifier) ? 0 : 1);
            // 券種ごとに合計枚数算出
            const ticketInfos = ticket.editTicketInfos(req, ticket.getTicketInfos(inquiryResult.order));
            // キャンセル料は1注文あたり1000円固定
            const cancellationFee = numeral(CANCEL_CHARGE)
                .format('0,0');
            // 画面描画
            res.render('inquiry/result', {
                code: inquiryResult.code,
                order: inquiryResult.order,
                moment: moment,
                reservations: reservations,
                ticketInfos: ticketInfos,
                enableCancel: true,
                cancellationFee: cancellationFee,
                layout: 'layouts/inquiry/layout',
                pageId: 'page_inquiry_result',
                pageClassName: `page-inquiry page-result page-complete page-${req.locale}`
            });
        }
        catch (error) {
            next(error);
        }
    });
}
exports.result = result;
/**
 * 注文返品処理
 */
function cancel(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        let order;
        try {
            const inquiryResult = req.session.inquiryResult;
            if (inquiryResult === undefined) {
                throw new Error(req.__('NotFound'));
            }
            order = inquiryResult.order;
        }
        catch (err) {
            res.status(http_status_1.INTERNAL_SERVER_ERROR)
                .json({ errors: [{ message: err.message }] });
            return;
        }
        // 返品メール作成
        const emailAttributes = {
            typeOf: cinerinoapi.factory.chevre.creativeWorkType.EmailMessage,
            sender: {
                name: process.env.EMAIL_SENDER_NAME,
                email: process.env.EMAIL_SENDER
            },
            toRecipient: {
                name: order.customer.name,
                email: order.customer.email
            },
            about: req.__('EmailTitleCan'),
            text: getCancelMail(req, order, CANCEL_CHARGE)
        };
        let returnOrderTransaction;
        try {
            // 注文返品取引開始
            returnOrderTransaction = yield returnOrderTransactionService.start({
                expires: moment()
                    .add(1, 'minute')
                    .toDate(),
                object: {
                    order: {
                        orderNumber: order.orderNumber,
                        customer: { telephone: order.customer.telephone }
                    }
                }
            });
            yield returnOrderTransactionService.confirm({
                id: returnOrderTransaction.id,
                potentialActions: {
                    returnOrder: {
                        potentialActions: {
                            sendEmailMessage: [{ object: emailAttributes }]
                        }
                    }
                }
            });
        }
        catch (err) {
            if (err instanceof cinerinoapi.factory.errors.Argument) {
                res.status(http_status_1.BAD_REQUEST)
                    .json({ errors: [{ message: err.message }] });
            }
            else {
                res.status(http_status_1.INTERNAL_SERVER_ERROR)
                    .json({ errors: [{ message: err.message }] });
            }
            return;
        }
        // セッションから照会結果を削除
        delete req.session.inquiryResult;
        res.status(http_status_1.CREATED)
            .json(returnOrderTransaction);
    });
}
exports.cancel = cancel;
/**
 * 注文照会画面検証
 */
function validate(req) {
    // 購入番号
    req.checkBody('paymentNo', req.__('NoInput{{fieldName}}', { fieldName: req.__('PaymentNo') })).notEmpty();
    req.checkBody('paymentNo', req.__('NoInput{{fieldName}}', { fieldName: req.__('PaymentNo') })).notEmpty();
    // 電話番号
    req.checkBody('purchaserTel', req.__('Message.minLength{{fieldName}}{{min}}', { fieldName: req.__('Label.Tel'), min: '4' })).len({ min: 4 });
}
/**
 * キャンセルメール本文取得
 */
function getCancelMail(req, order, fee) {
    const reservations = order.acceptedOffers.map((o) => o.itemOffered);
    const mail = [];
    const locale = req.session.locale;
    const faqUrl = `https://${req.hostname}/faq?locale=${locale}`;
    // 東京タワー TOP DECK チケットキャンセル完了のお知らせ
    mail.push(req.__('EmailTitleCan'));
    mail.push('');
    // 姓名編集: 日本語の時は"姓名"他は"名姓"
    const purchaserName = (locale === 'ja') ?
        `${order.customer.familyName} ${order.customer.givenName}` :
        `${order.customer.givenName} ${order.customer.familyName}`;
    // XXXX XXXX 様
    mail.push(req.__('EmailDestinationName{{name}}', { name: purchaserName }));
    mail.push('');
    // この度は、「東京タワー TOP DECK」のオンライン先売りチケットサービスにてご購入頂き、誠にありがとうございます。
    mail.push(req.__('EmailHead1').replace('$theater_name$', (locale === 'ja')
        ? String(reservations[0].reservationFor.superEvent.location.name.ja)
        : String(reservations[0].reservationFor.superEvent.location.name.en)));
    // お客様がキャンセルされましたチケットの情報は下記の通りです。
    mail.push(req.__('EmailHead2Can'));
    mail.push('');
    // 購入番号
    mail.push(`${req.__('PaymentNo')} : ${order.confirmationNumber}`);
    // ご来塔日時
    const day = moment(reservations[0].reservationFor.startDate)
        .tz('Asia/Tokyo')
        .format('YYYY/MM/DD');
    const time = moment(reservations[0].reservationFor.startDate)
        .tz('Asia/Tokyo')
        .format('HH:mm');
    mail.push(`${req.__('EmailReserveDate')} : ${day} ${time}`);
    // 券種、枚数
    mail.push(`${req.__('TicketType')} ${req.__('TicketCount')}`);
    // 券種ごとに合計枚数算出
    const ticketInfos = ticket.editTicketInfos(req, ticket.getTicketInfos(order));
    Object.keys(ticketInfos).forEach((key) => {
        mail.push(ticketInfos[key].info);
    });
    // 合計金額算出
    const price = order.price;
    mail.push('-------------------------------------');
    // 合計枚数
    mail.push(req.__('EmailTotalTicketCount{{n}}', { n: order.acceptedOffers.length.toString() }));
    // 合計金額
    mail.push(`${req.__('TotalPrice')} ${req.__('{{price}} yen', { price: numeral(price).format('0,0') })}`);
    // キャンセル料
    mail.push(`${req.__('CancellationFee')} ${req.__('{{price}} yen', { price: numeral(fee).format('0,0') })}`);
    mail.push('-------------------------------------');
    mail.push('');
    // ご注意事項
    mail.push(req.__('EmailNotice2Can'));
    // ・チケット購入金額全額をチケット購入時のクレジットカードに返金した後、チケットキャンセル料【1000円】を引き落としさせていただきます。
    mail.push(req.__('EmailNotice3Can'));
    // ・チケットの再購入をされる場合は、最初のお手続きよりご購入ください。
    mail.push(req.__('EmailNotice4Can'));
    // ・チケットを再度購入されてもキャンセル料は返金いたしません。
    mail.push(req.__('EmailNotice5Can'));
    mail.push('');
    // ※よくあるご質問（ＦＡＱ）はこちら
    mail.push(req.__('EmailFAQURL'));
    mail.push(faqUrl);
    mail.push('');
    // なお、このメールは、「東京タワー トップデッキツアー」の予約システムでチケットをキャンセル…
    mail.push(req.__('EmailFoot1Can'));
    // ※尚、このメールアドレスは送信専用となっておりますでので、ご返信頂けません。
    mail.push(req.__('EmailFoot2'));
    // ご不明※な点がございましたら、下記番号までお問合わせください。
    mail.push(req.__('EmailFoot3'));
    mail.push('');
    // お問い合わせはこちら
    mail.push(req.__('EmailAccess1'));
    // TEL
    mail.push(req.__('EmailAccess2'));
    return (mail.join('\n'));
}
