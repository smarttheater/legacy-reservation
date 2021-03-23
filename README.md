# Legecy Reservation

Node.jsアプリケーション

## Table of contents

* [Usage](#usage)
* [License](#license)

## Usage
npmでパッケージをインストールします。
* [npm](https://www.npmjs.com/)

```shell
npm install
```

npmでローカルサーバー起動。

```shell
npm start
```

[注文入場ページ](http://localhost:8080/customer/reserve/start?wc=0&locale=ja)にアクセスすると、ローカルでウェブアプリを確認できます。

### Environment variables

| Name                          | Required | Value                             | Purpose                       |
| ----------------------------- | -------- | --------------------------------- | ----------------------------- |
| `DEBUG`                       | false    | smarttheater-legacy-reservation:* | Debug                         |
| `NODE_ENV`                    | true     |                                   | (development,test,production) |
| `CINERINO_API_ENDPOINT`       | true     |                                   | Cinerino endpoint             |
| `API_CLIENT_ID`               | true     |                                   | API credentials               |
| `API_CLIENT_SECRET`           | true     |                                   | API credentials               |
| `API_AUTHORIZE_SERVER_DOMAIN` | true     |                                   | API credentials               |
| `REDIS_HOST`                  | true     |                                   | redis host                    |
| `REDIS_PORT`                  | true     |                                   | redis port                    |
| `REDIS_KEY`                   | true     |                                   | redis key                     |
| `GMO_ENDPOINT`                | true     |                                   | GMO API endpoint              |
| `PROJECT_ID`                  | true     |                                   | Project ID                    |

## License

UNLICENSED
