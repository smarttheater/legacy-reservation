# TTTSチケット予約ウェブアプリケーション

node.jsでGMOサービスを使うためのパッケージです。


## Table of contents

* [Usage](#usage)
* [Example](#code-samples)
* [Jsdoc](#jsdoc)
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

| Name                              | Required | Value                     | Purpose                                  |
| --------------------------------- | -------- | ------------------------- | ---------------------------------------- |
| `DEBUG`                           | false    | ttts-frontend:*           | Debug                                    |
| `NPM_TOKEN`                       | true     |                           | NPM auth token                           |
| `NODE_ENV`                        | true     |                           | 環境名(development,test,productionなど)    |
| `SENDGRID_API_KEY`                | true     |                           | GMOリンク決済からの戻り先エンドポイント                |
| `API_ENDPOINT`                    | true     |                           | frontと連携するttts apiのエンドポイント             |
| `API_CLIENT_ID`                   | true     |                           | APIクライアントID                              |
| `API_CLIENT_SECRET`               | true     |                           | APIクライアントシークレット                          |
| `API_AUTHORIZE_SERVER_DOMAIN`     | true     |                           | API認可サーバードメイン                          |
| `API_RESOURECE_SERVER_IDENTIFIER` | true     |                           | APIリソースサーバー識別子                        |
| `REDIS_HOST`                      | true     |                           | redis host                               |
| `REDIS_PORT`                      | true     |                           | redis port                               |
| `REDIS_KEY`                       | true     |                           | redis key                                |
| `GMO_ENDPOINT`                    | true     |                           | GMO apiのエンドポイント                          |
| `GMO_SITE_ID`                     | true     |                           | GMO サイトID                                |
| `RESERVATIONS_PRINT_URL`          | true     |                           | 予約印刷URL                              |
| `RESERVABLE_EVENT_START_FROM`     | true     | 2018-02-20T00:00:00+09:00 | 予約可能なイベント開始日時from(ISO8601フォーマット) |


## Code Samples

コードサンプルは [example](https://github.com/motionpicture/gmo-service/tree/master/example) にあります。


## Jsdoc

`npm run doc`でjsdocを作成できます。./docに出力されます。

## License

UNLICENSED
