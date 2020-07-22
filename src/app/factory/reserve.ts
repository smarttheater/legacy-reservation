import * as cinerinoapi from '@cinerino/sdk';
import * as tttsapi from '@motionpicture/ttts-api-nodejs-client';
import * as conf from 'config';
import { Response } from 'express';
import * as moment from 'moment-timezone';
import * as numeral from 'numeral';

/**
 * 予約完了メールを作成する
 */
export function createEmailAttributes(
    event: tttsapi.factory.performance.IPerformanceWithDetails,
    customerProfile: cinerinoapi.factory.person.IProfile,
    price: number,
    ticketTypes: Express.ITicketType[],
    res: Response
): cinerinoapi.factory.creativeWork.message.email.IAttributes {
    const to = (typeof customerProfile.email === 'string') ? customerProfile.email : '';
    if (to.length === 0) {
        throw new Error('email to unknown');
    }

    const title = res.__('Title');
    const titleEmail = res.__('EmailTitle');

    // メール本文取得
    const text: string = getMailTemplate(
        event,
        customerProfile,
        price,
        ticketTypes,
        res
    );

    return {
        typeOf: cinerinoapi.factory.creativeWorkType.EmailMessage,
        sender: {
            name: conf.get<string>('email.fromname'),
            email: conf.get<string>('email.from')
        },
        toRecipient: {
            name: `${customerProfile.givenName} ${customerProfile.familyName}`,
            email: to
        },
        about: `${title} ${titleEmail}`,
        text: text
    };
}

// tslint:disable-next-line:max-func-body-length
export function getMailTemplate(
    event: tttsapi.factory.performance.IPerformanceWithDetails,
    customerProfile: cinerinoapi.factory.person.IProfile,
    price: number,
    ticketTypes: Express.ITicketType[],
    res: Response
): string {
    const mail: string[] = [];
    const locale: string = res.locale;

    // 東京タワートップデッキツアーチケット購入完了のお知らせ
    mail.push(res.__('EmailTitle'));
    mail.push('');

    // 姓名編集: 日本語の時は"姓名"他は"名姓"
    const purchaserName = (locale === 'ja')
        ? `${customerProfile.familyName} ${customerProfile.givenName}`
        : `${customerProfile.givenName} ${customerProfile.familyName}`;
    // XXXX XXXX 様
    mail.push(res.__('EmailDestinationName{{name}}', { name: purchaserName }));
    mail.push('');

    // この度は、「東京タワー トップデッキツアー」のWEBチケット予約販売をご利用頂き、誠にありがとうございます。
    mail.push(res.__('EmailHead1').replace(
        '$theater_name$', (<any>event.superEvent.location.name)[locale]
    ));
    // お客様がご購入されましたチケットの情報は下記の通りです。
    mail.push(res.__('EmailHead2'));
    mail.push('');

    // 購入番号
    // mail.push(`${res.__('PaymentNo')} : #{order.identifier.find((i)=>i.name==='paymentNo').value}`);
    mail.push(`${res.__('PaymentNo')} : #{order.confirmationNumber}`);

    // ご来塔日時
    const day: string = moment(event.startDate).tz('Asia/Tokyo').format('YYYY/MM/DD');
    const time: string = moment(event.startDate).tz('Asia/Tokyo').format('HH:mm');
    mail.push(`${res.__('EmailReserveDate')} : ${day} ${time}`);

    // 券種、枚数
    mail.push(`${res.__('TicketType')} ${res.__('TicketCount')}`);

    // 券種ごとの表示情報編集
    ticketTypes.forEach((ticketType) => {
        const unitPriceSpec = ticketType.priceSpecification.priceComponent
            .find((p) => p.typeOf === cinerinoapi.factory.chevre.priceSpecificationType.UnitPriceSpecification);
        const unitPrice = (unitPriceSpec !== undefined) ? unitPriceSpec.price : 0;
        const ticketCountEdit = res.__('{{n}}Leaf', { n: ticketType.count.toString() });
        const ticketInfoStr = `${(<any>ticketType.name)[locale]} ${`\\${numeral(unitPrice).format('0,0')}`} × ${ticketCountEdit}`;
        mail.push(ticketInfoStr);
    });
    mail.push('-------------------------------------');
    // 合計枚数
    const numTickets = ticketTypes.reduce((a, b) => a + Number(b.count), 0);
    mail.push(res.__('EmailTotalTicketCount{{n}}', { n: numTickets.toString() }));
    // 合計金額
    mail.push(`${res.__('TotalPrice')} ${res.__('{{price}} yen', { price: numeral(price).format('0,0') })}`);
    mail.push('-------------------------------------');
    // ※ご入場の際はQRコードが入場チケットとなります。下記のチケット照会より、QRコードを画面撮影もしくは印刷の上、ご持参ください。
    mail.push(res.__('EmailAboutQR'));
    mail.push('');

    // ●チケット照会はこちら
    mail.push(res.__('EmailInquiryUrl'));
    mail.push((conf.get<any>('official_url_inquiry_by_locale'))[locale]);
    mail.push('');

    // ●ご入場方法はこちら
    mail.push(res.__('EmailEnterURL'));
    mail.push((conf.get<any>('official_url_aboutentering_by_locale'))[locale]);
    mail.push('');

    // [ご注意事項]
    mail.push(res.__('EmailNotice1'));
    mail.push(res.__('EmailNotice9'));
    mail.push(res.__('EmailNotice2'));
    mail.push(res.__('EmailNotice3'));
    mail.push(res.__('EmailNotice4'));
    mail.push(res.__('EmailNotice5'));
    mail.push(res.__('EmailNotice6'));
    mail.push(res.__('EmailNotice7'));
    mail.push(res.__('EmailNotice8'));
    mail.push('');

    // ※よくあるご質問（ＦＡＱ）はこちら
    mail.push(res.__('EmailFAQURL'));
    mail.push((conf.get<any>('official_url_faq_by_locale'))[locale]);
    mail.push('');

    // なお、このメールは、「東京タワー トップデッキツアー」の予約システムでチケットをご購入頂いた方にお送りしておりますが、チケット購入に覚えのない方に届いております場合は、下記お問い合わせ先までご連絡ください。
    mail.push(res.__('EmailFoot1').replace('$theater_name$', (<any>event.superEvent.location.name)[locale]));
    // ※尚、このメールアドレスは送信専用となっておりますでので、ご返信頂けません。
    mail.push(res.__('EmailFoot2'));
    // ご不明な点がございましたら、下記番号までお問合わせください。
    mail.push(res.__('EmailFoot3'));
    mail.push('');

    // お問い合わせはこちら
    mail.push(res.__('EmailAccess1'));
    // 東京タワー TEL : 03-3433-5111 / 9：00am～17：00pm（年中無休）
    mail.push(res.__('EmailAccess2'));

    return mail
        .map((str) => `| ${str}`)
        .join('\n');
}
