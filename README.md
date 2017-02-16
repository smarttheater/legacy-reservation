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

typescriptをjavascriptにコンパイルします。wオプションでファイル変更監視できます。
```shell
tsc -w
```

npmでローカルサーバーを立ち上げることができます。
```shell
npm start
```
(http://localhost:8080)にアクセスすると、ローカルでウェブアプリを確認できます。

# tslint

コード品質チェックをtslintで行っています。lintパッケージとして以下を仕様。
* [tslint](https://github.com/palantir/tslint)
* [tslint-microsoft-contrib](https://github.com/Microsoft/tslint-microsoft-contrib)
`npm run tslint`でチェック実行。改修の際には、必ずチェックすること。
