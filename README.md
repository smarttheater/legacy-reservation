# 東京タワーチケット予約ウェブアプリケーション

# Features

# Getting Started

## インフラ
基本的にnode.jsのウェブアプリケーションです。
ウェブサーバーとしては、AzureのWebAppsあるいはGCPのAppEngineを想定しており、両方で動くように開発していくことが望ましい。

## 言語
実態としては、linuxあるいはwindows上でnode.jsは動くわけですが、プログラミング言語としては、alternative javascriptのひとつであるTypeScriptを採用しています。

* TypeScript(https://www.typescriptlang.org/)

## 開発方法
npmでパッケージをインストールします。npmはnode.jsでスタンダードなパッケージ管理ツールです。パッケージ管理にとどまらず、開発やサーバー起動においても活躍します。
```shell
npm install
```
* npm(https://www.npmjs.com/)

typingsで型定義をインストール。
```shell
typings install
```

typescriptをjavascriptにコンパイルします。wオプションでファイル変更監視できます。
```shell
tsc -w
```

npmでローカルサーバーを立ち上げることができます。
```shell
npm start
```
(http://localhost:8080)にアクセスすると、ローカルでウェブアプリを確認できます。

## Required environment variables
```shell
set SENDGRID_API_KEY=**********
set TTTS_PERFORMANCE_STATUSES_REDIS_HOST=**********
set TTTS_PERFORMANCE_STATUSES_REDIS_PORT=**********
set TTTS_PERFORMANCE_STATUSES_REDIS_KEY=**********
```
only on Aure WebApps
```shell
set WEBSITE_NODE_DEFAULT_VERSION=**********
set NODE_ENV=**********
set WEBSITE_TIME_ZONE=Tokyo Standard Time
```


# tslint

コード品質チェックをtslintで行っています。lintパッケージとして以下を仕様。
* [tslint](https://github.com/palantir/tslint)
* [tslint-microsoft-contrib](https://github.com/Microsoft/tslint-microsoft-contrib)
`npm run tslint`でチェック実行。改修の際には、必ずチェックすること。
