# デバッグ・テスト用ファイル

このフォルダには開発・デバッグ用のファイルが含まれています。

## 📄 ファイル一覧

### `test.html`
- **目的**: 最適化機能のテスト
- **機能**: 
  - パフォーマンス測定
  - 機能テスト用UI
  - 最適化効果の確認

### `debug-split-button.html`
- **目的**: 分割表示ボタンのデバッグ
- **機能**:
  - 分割表示機能の状態確認
  - UI要素の検査
  - イベントハンドラのテスト

### `test-split-button.html`
- **目的**: 分割ボタン機能のテスト
- **機能**:
  - DOM要素の存在確認
  - ボタンの動作テスト
  - JavaScript機能の検証

## 🔧 使用方法

1. **ローカルサーバーでの実行**:
   ```bash
   # Python使用の場合
   python -m http.server 8000
   
   # Node.js使用の場合
   npx serve .
   ```

2. **ファイルアクセス**:
   - `http://localhost:8000/debug/test.html`
   - `http://localhost:8000/debug/debug-split-button.html`
   - `http://localhost:8000/debug/test-split-button.html`

## ⚠️ 注意事項

- これらのファイルは開発用であり、本番環境には含めません
- メインアプリケーション（`index.html`）の動作に影響はありません
- デバッグ情報はブラウザのコンソールに出力されます

## 🔍 デバッグのヒント

- **Chrome DevTools**: F12キーで開発者ツールを開く
- **コンソールログ**: `console.log()` の出力を確認
- **ネットワークタブ**: リソースの読み込み状況をチェック
- **パフォーマンスタブ**: レンダリング性能を測定

## 📊 関連ドキュメント

- `/document/OPTIMIZATION_REPORT.md` - パフォーマンス最適化レポート
- `/document/PROJECT_SUMMARY.md` - プロジェクト概要
- `/document/CLAUDE.md` - プロジェクト設定