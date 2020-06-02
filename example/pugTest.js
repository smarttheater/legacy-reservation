const pug = require('pug');

async function main() {
    const emailTemplate = `
| #{order.customer.familyName} #{order.customer.givenName} 様
| ご注文商品をお届けしました。詳細は下記の通りです。
| 
| 注文番号: #{order.orderNumber}
| 
| 確認番号: #{order.identifier.find((i)=>i.name==='paymentNo').value}
`;

    const emailMessageText = await new Promise((resolve, reject) => {
        pug.render(
            emailTemplate,
            {
                order: {
                    identifier: [{ name: 'paymentNo', value: '123' }],
                    orderNumber: '12345',
                    customer: { familyName: 'セイ', givenName: 'メイ' }
                }
            },
            (err, message) => {
                if (err instanceof Error) {
                    reject(new factory.errors.Argument('emailTemplate', err.message));

                    return;
                }

                resolve(message);
            }
        );
    });

    console.log(emailMessageText);
}

main().catch(console.error);