# TTTS予約ウェブアプリケーション

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

typescriptをコンパイルします。wオプションでファイル変更監視。

```shell
npm run build -- -w
```

npmでローカルサーバー起動。

```shell
npm start
```

[注文入場ページ](http://localhost:8080/entrance/index.html?wc=0&locale=ja)にアクセスすると、ローカルでウェブアプリを確認できます。

ビルドファイルクリーン

```shell
npm run clean
```

scssビルド

```shell
npm run css
```

### Environment variables

| Name                          | Required | Value           | Purpose                       |
| ----------------------------- | -------- | --------------- | ----------------------------- |
| `DEBUG`                       | false    | ttts-frontend:* | Debug                         |
| `NODE_ENV`                    | true     |                 | (development,test,production) |
| `CINERINO_API_ENDPOINT`       | true     |                 | Cinerino endpoint             |
| `API_CLIENT_ID`               | true     |                 | API credentials               |
| `API_CLIENT_SECRET`           | true     |                 | API credentials               |
| `API_AUTHORIZE_SERVER_DOMAIN` | true     |                 | API credentials               |
| `REDIS_HOST`                  | true     |                 | redis host                    |
| `REDIS_PORT`                  | true     |                 | redis port                    |
| `REDIS_KEY`                   | true     |                 | redis key                     |
| `GMO_ENDPOINT`                | true     |                 | GMO API endpoint              |
| `RESERVATIONS_PRINT_URL`      | true     |                 | 予約印刷URL                   |

## License

UNLICENSED
