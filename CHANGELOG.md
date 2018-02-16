# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/).

## Unreleased
### Added

### Changed

### Deprecated

### Removed

### Fixed
- 注文取引確定時の注文番号重複エラーをシステムエラーとしてハンドリング。
- 注文取引確定時の注文番号重複エラーメッセージを追加

### Security


## v7.0.3 - 2018-02-14
### Fixed
- 注文取引確定時の注文番号重複エラーをシステムエラーとしてハンドリング。

## v7.0.2 - 2018-02-02
# TTTS-322
### Fixed
- 購入者情報登録のリクエストから国コードが除外されるバグを修正。

## v7.0.1 - 2018-02-01
### Added
- 開発用に入場ページを設置。

### Fixed
- 購入者情報登録のリクエストから国コードが除外されるバグを修正。

## v7.0.0 - 2018-01-19
### Changed
- 注文取引開始時のWAITER許可証を必須化。
- 購入フロー中のエラー時HTTPステータスコードを調整。
- Googleタグマネージャー用のスクリプト調整。

### Fixed
- 車椅子ページへの遷移ができないバグ対応。

## v6.0.2 - 2017-12-13
### Changed
- APIの認証情報をCognitoから取得するように変更。

## v6.0.1 - 2017-12-13
### Removed
- 不要なコードを削除。

## v6.0.0 - 2017-12-13
### Changed
- ttts-domain@12.0.0で再実装。
