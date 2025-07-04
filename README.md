# 情報科学専門学校 PDFビューア

![ISC Logo](https://img.shields.io/badge/ISC-情報科学専門学校-0066CC?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiBmaWxsPSIjMDA2NkNDIi8+Cjx0ZXh0IHg9IjE2IiB5PSIyMCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+SVNDPC90ZXh0Pgo8L3N2Zz4K)

岩崎学園情報科学専門学校の学校案内2026年版をオンラインで閲覧できる高機能PDFビューアです。

## 🌟 主な特徴

### 📱 レスポンシブデザイン
- **PC・タブレット・スマートフォン**すべてのデバイスに対応
- モバイルファーストなUI設計
- タッチ操作に最適化

### 🎨 モダンなUI/UX
- **ISCブランドカラー**（#0066CC）を基調とした統一感のあるデザイン
- Material Design風のモダンなインターフェース
- スムーズなアニメーションとトランジション
- ダークモード・高コントラストモード対応

### 📚 インテリジェントな目次ナビゲーション
- **学科・コース別**の詳細な目次
- 現在のページをハイライト表示
- 人気・注目学科のバッジ表示
- ワンクリックでの直接ジャンプ

### 🔍 高度なズーム機能
- **拡大・縮小・フィット**機能
- 幅調整・全体表示モード
- マウスホイールズーム（Ctrl+ホイール）
- 全画面表示モード

### ⌨️ 豊富なキーボードショートカット
```
← / → : ページ移動
Home/End : 最初/最後のページ
+ / - : ズーム
F : 全体表示
W : 幅調整
F11 : 全画面
? : ヘルプ表示
Esc : 終了
```

### 🚀 パフォーマンス最適化
- **Progressive Web App (PWA)** 対応
- 高解像度ディスプレイ（Retina）対応
- 効率的なメモリ使用
- 遅延読み込み・キャッシュ機能

### ♿ アクセシビリティ対応
- **ARIA属性**による支援技術対応
- キーボードナビゲーション完全対応
- 十分なカラーコントラスト比
- スクリーンリーダー対応

## 🏫 学校情報

**情報科学専門学校（ISC）**は1983年に創立された神奈川県初のIT専門学校です。

### 📍 基本情報
- **所在地**: 〒221-0835 横浜市神奈川区鶴屋町2-17 相鉄岩崎学園ビル
- **アクセス**: JR横浜駅「きた西口」より**徒歩1分**
- **運営**: 学校法人岩崎学園（創立97年）
- **就職率**: **98.9%**（2024年3月卒業生実績）

### 🎓 学科構成（2026年度）

#### 4年制学科
- **情報セキュリティ学科**（定員40名）
  - ITスペシャリストコース
  - サイバースペシャリストコース
- **実践AI科**（定員40名）
  - AIシステムコース
  - データサイエンスコース

#### 3年制学科
- **先端ITシステム科**（定員25名）
  - eスポーツ・ゲーム開発コース
  - VR・メタバース開発コース

#### 2年制学科
- **情報処理科**（定員160名）
  - ゲームプログラミングコース
  - システム開発コース
  - ネットワーク・インフラコース
  - AI活用コース
- **実践IoT科**（定員20名）
  - IoTシステムコース
  - IoTロボットコース
- **Web技術科**（定員40名）
  - Webデザイナーコース
  - Webアプリコース
- **ビジネス科**（定員40名）
  - 経営ビジネスコース
  - 一般事務・秘書コース
  - 販売・ショップ店員コース
  - IT活用コース
  - 簿記・会計コース

#### 1年制学科
- **ITライセンス科**（定員25名）

## 💻 技術仕様

### フロントエンド
- **HTML5** - セマンティックマークアップ
- **CSS3** - Flexbox/Grid、カスタムプロパティ
- **JavaScript (ES2020+)** - モジュール化されたアーキテクチャ
- **PDF.js (v3.11.174)** - Mozilla製PDFレンダリングライブラリ

### ライブラリ・フレームワーク
```javascript
{
  "pdf.js": "3.11.174",
  "viewport-meta": "responsive",
  "pwa": "manifest.json",
  "fonts": "Noto Sans JP, Hiragino Kaku Gothic ProN"
}
```

### ブラウザサポート
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ iOS Safari 14+
- ✅ Android Chrome 90+

## 🚀 デプロイメント

### GitHub Pages での公開
```bash
# リポジトリをクローン
git clone https://github.com/asaiui/pdf-viewer.git
cd pdf-viewer

# GitHub Pages で自動公開
# https://asaiui.github.io/pdf-viewer/
```

### ローカル開発環境
```bash
# HTTPサーバーを起動（例：Python）
python -m http.server 8000

# または Node.js の場合
npx serve .

# ブラウザでアクセス
open http://localhost:8000
```

## 📁 プロジェクト構造

```
isc-pdf-viewer/
├── index.html              # メインHTMLファイル
├── style.css               # メインスタイルシート
├── manifest.json           # PWAマニフェスト
├── README.md               # プロジェクト説明
├── js/                     # JavaScript モジュール
│   ├── main.js             # メインアプリケーション
│   ├── pdf-loader.js       # PDF読み込み機能
│   ├── page-navigator.js   # ページナビゲーション
│   ├── zoom-manager.js     # ズーム制御
│   ├── fullscreen-manager.js # 全画面表示
│   ├── content-analyzer.js # PDF内容分析
│   ├── mobile-menu.js      # モバイルメニュー
│   └── demo-content.js     # デモコンテンツ
├── pdf/                    # PDFファイル格納
│   └── test.pdf
└── images/                 # 画像ファイル
    ├── isc-logo.png
    ├── screenshot-desktop.png
    └── screenshot-mobile.png
```

## 🎯 カスタマイズ方法

### ブランドカラーの変更
```css
:root {
  --primary-500: #0066CC;    /* メインカラー */
  --primary-600: #0052A3;    /* ダークバリエーション */
  --accent-500: #FF6600;     /* アクセントカラー */
}
```

### 目次構造のカスタマイズ
```javascript
// index.html の目次セクションを編集
<div class="toc-section">
    <div class="toc-section-title">新しいセクション</div>
    <ul class="toc-list">
        <li class="toc-item">
            <a href="#" class="toc-link" data-page="1">
                <span class="toc-icon">📋</span>
                <span class="toc-text">新しいページ</span>
            </a>
        </li>
    </ul>
</div>
```

### デモコンテンツの追加
```javascript
// js/demo-content.js でデモページを追加
{
    title: '新しいページタイトル',
    content: [
        '内容行1',
        '内容行2',
        '内容行3'
    ]
}
```

## 🔧 高度な機能

### 動的リサイズ
- サイドバーの幅調整
- コントロールバーの高さ調整
- ドラッグ&ドロップによる直感的操作

### エラーハンドリング
- PDF読み込み失敗時の自動フォールバック
- デモコンテンツによる代替表示
- 詳細なエラーメッセージとガイダンス

### パフォーマンス監視
- ページレンダリング時間の最適化
- メモリ使用量の効率化
- 大容量PDFファイルの段階的読み込み

## 🛠️ 開発者向け情報

### アーキテクチャパターン
```javascript
// モジュール化されたクラス設計
class ISCPDFViewer {
    constructor() {
        this.pdfLoader = new PDFLoader(this);
        this.pageNavigator = new PageNavigator(this);
        this.zoomManager = new ZoomManager(this);
        // ...
    }
}
```

### イベントシステム
```javascript
// カスタムイベントでの機能間通信
this.dispatchEvent(new CustomEvent('pageChanged', {
    detail: { currentPage: this.currentPage }
}));
```

### 設定可能なオプション
```javascript
const viewerConfig = {
    defaultZoom: 1.2,
    enableKeyboardShortcuts: true,
    showProgress: true,
    autoHideControls: false,
    mobileBreakpoint: 768
};
```

## 📱 PWA機能

### インストール可能
- ホーム画面に追加
- ネイティブアプリライクな体験
- オフライン対応（部分的）

### パフォーマンス指標
- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s
- **Time to Interactive**: < 3.8s
- **Cumulative Layout Shift**: < 0.1

## 🧪 テスト環境

### 動作確認済みデバイス
- **Desktop**: Windows 10/11, macOS 12+, Ubuntu 20.04+
- **Mobile**: iPhone 12+, iPad Air, Galaxy S21+, Pixel 6+
- **Browser**: Chrome, Firefox, Safari, Edge

### パフォーマンステスト
```bash
# Lighthouse スコア
Performance: 95+
Accessibility: 100
Best Practices: 95+
SEO: 100
PWA: 100
```

## 🔗 関連リンク

- 🏫 [情報科学専門学校 公式サイト](https://isc.iwasaki.ac.jp/)
- 📚 [岩崎学園 公式サイト](https://iwasaki.ac.jp/)
- 💻 [GitHub リポジトリ](https://github.com/asaiui/pdf-viewer)
- 🌐 [ライブデモ](https://asaiui.github.io/pdf-viewer/)

## 📞 お問い合わせ

### 学校への問い合わせ
- **電話**: 045-311-5562
- **住所**: 〒221-0835 横浜市神奈川区鶴屋町2-17
- **アクセス**: JR横浜駅「きた西口」より徒歩1分

### 技術的な問い合わせ
- **GitHub Issues**: [報告・要望](https://github.com/asaiui/pdf-viewer/issues)
- **Email**: [技術サポート](mailto:support@example.com)

## 📄 ライセンス

MIT License - 詳細は [LICENSE](LICENSE) ファイルを参照してください。

## 🙏 謝辞

- **PDF.js チーム** - 優秀なPDFレンダリングライブラリの提供
- **岩崎学園** - 教育機関としての長年の貢献
- **オープンソースコミュニティ** - 様々なライブラリとツールの提供

---

<div align="center">

**情報科学専門学校 PDFビューア**

[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Live-brightgreen?style=for-the-badge&logo=github)](https://asaiui.github.io/pdf-viewer/)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-blue?style=for-the-badge&logo=pwa)](https://asaiui.github.io/pdf-viewer/)
[![Mobile Friendly](https://img.shields.io/badge/Mobile-Friendly-orange?style=for-the-badge&logo=mobile)](https://asaiui.github.io/pdf-viewer/)

Made with ❤️ for 情報科学専門学校

</div>