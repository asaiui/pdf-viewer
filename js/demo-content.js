/**
 * デモコンテンツ表示クラス
 * PDFが読み込めない場合の代替表示を管理
 */
class DemoContent {
    constructor(viewer) {
        this.viewer = viewer;
        this.demoPages = this.createDemoPages();
    }

    createDemoPages() {
        return [
            {
                title: '表紙・学校案内',
                content: [
                    '情報科学専門学校',
                    '学校案内 2026',
                    '神奈川県初のIT専門学校（1983年創立）',
                    '横浜駅から徒歩1分の好立地',
                    '就職率98.9% | 資格取得サポート充実'
                ]
            },
            {
                title: 'ISCの10の魅力',
                content: [
                    '① 神奈川県初のIT専門学校として40年の実績',
                    '② 横浜駅から徒歩1分の抜群のアクセス',
                    '③ 就職率98.9%の実績',
                    '④ 大手企業への豊富な就職実績',
                    '⑤ 無償貸与PC制度（最新ノートPC配布）',
                    '⑥ 職業実践専門課程認定（全6学科）',
                    '⑦ 入学後のコース変更・学科編入可能',
                    '⑧ 充実した資格取得サポート',
                    '⑨ 最新設備・実習環境の完備',
                    '⑩ 97年の伝統を持つ岩崎学園グループ'
                ]
            },
            {
                title: '情報セキュリティ学科（4年制）',
                content: [
                    '定員：40名',
                    'ITスペシャリストコース',
                    'サイバースペシャリストコース',
                    '4年間でITを総合的に学び、',
                    'ワンランク上のシステム開発者を育成',
                    '取得可能資格：',
                    '・基本情報技術者試験（国家資格）',
                    '・情報セキュリティマネジメント試験',
                    '・CISSP等の高度資格'
                ]
            },
            {
                title: '実践AI科（4年制）',
                content: [
                    '定員：40名',
                    'AIシステムコース',
                    'データサイエンスコース',
                    'AI技術で未来をひらく人材育成',
                    '機械学習、深層学習などの最新AI技術',
                    '主な学習内容：',
                    '・Python プログラミング',
                    '・機械学習アルゴリズム',
                    '・ディープラーニング',
                    '・データ分析・可視化'
                ]
            },
            {
                title: '先端ITシステム科（3年制）',
                content: [
                    '定員：25名',
                    'eスポーツ・ゲーム開発コース',
                    'VR・メタバース開発コース',
                    '最先端の実習・開発環境',
                    'ゲーム開発技術を習得',
                    '使用技術：',
                    '・Unity, Unreal Engine',
                    '・C#, C++ プログラミング',
                    '・VR/AR開発',
                    '・3Dモデリング'
                ]
            },
            {
                title: '情報処理科（2年制）',
                content: [
                    '定員：160名',
                    'ゲームプログラミングコース',
                    'システム開発コース',
                    'ネットワーク・インフラコース',
                    'AI活用コース',
                    '2年間でITの基礎＋強みを身につける',
                    '主な資格：',
                    '・基本情報技術者試験',
                    '・応用情報技術者試験',
                    '・ITパスポート試験'
                ]
            },
            {
                title: '実践IoT科（2年制）',
                content: [
                    '定員：20名',
                    'IoTシステムコース',
                    'IoTロボットコース',
                    'IoTにかかせない技術について',
                    'ハードとソフトを総合的に学習',
                    '暮らしを変える技術者を育成',
                    '学習内容：',
                    '・センサー技術',
                    '・マイコンプログラミング',
                    '・ネットワーク技術',
                    '・クラウド連携'
                ]
            },
            {
                title: 'Web技術科（2年制）',
                content: [
                    '定員：40名',
                    'Webデザイナーコース',
                    'Webアプリコース',
                    '新たなトレンドを生み出すWeb技術者を育成',
                    '無償貸与のMacBook Air（M1搭載）を使用',
                    '主な学習技術：',
                    '・HTML/CSS',
                    '・JavaScript',
                    '・React, Vue.js',
                    '・PHP, Python',
                    '・UI/UXデザイン'
                ]
            },
            {
                title: 'ビジネス科（2年制）',
                content: [
                    '定員：40名',
                    '一般事務・秘書コース',
                    '販売・ショップ店員コース',
                    'IT活用コース',
                    '簿記・会計コース',
                    '経営ビジネスコース',
                    'PCスキルを身につけ安定の事務就職を実現',
                    '取得資格：',
                    '・日商簿記検定',
                    '・MOSマスター',
                    '・秘書検定'
                ]
            },
            {
                title: '就職サポート体制',
                content: [
                    '就職率：98.9%（2024年3月卒業生実績）',
                    '主要就職先：',
                    '・SBテクノロジー株式会社',
                    '・NTT東日本グループ会社',
                    '・日本IBM デジタルサービス株式会社',
                    '・富士ソフト株式会社',
                    '・株式会社システナ',
                    '・横浜銀行',
                    'サポート内容：',
                    '・個別就職指導',
                    '・企業説明会',
                    '・インターンシップ',
                    '・面接対策'
                ]
            }
        ];
    }

    showDemoContent() {
        const pageIndex = Math.min(this.viewer.currentPage - 1, this.demoPages.length - 1);
        const pageData = this.demoPages[pageIndex] || this.demoPages[0];
        
        this.renderDemoPage(pageData);
        
        // デモ表示の場合の総ページ数設定
        if (!this.viewer.totalPages) {
            this.viewer.totalPages = this.demoPages.length;
            if (this.viewer.totalPagesSpan) {
                this.viewer.totalPagesSpan.textContent = this.viewer.totalPages;
            }
            if (this.viewer.sidebarTotalPages) {
                this.viewer.sidebarTotalPages.textContent = `${this.viewer.totalPages}ページ（デモ）`;
            }
            this.viewer.updateControls();
        }
        
        // ローディング表示を隠す
        if (this.viewer.loadingIndicator) {
            this.viewer.loadingIndicator.style.display = 'none';
        }
        this.viewer.canvas.style.display = 'block';
        this.viewer.canvas.classList.add('fade-in');
    }

    renderDemoPage(pageData) {
        const canvas = this.viewer.canvas;
        const ctx = this.viewer.ctx;
        
        // キャンバスサイズを設定
        canvas.width = 800;
        canvas.height = 1000;
        canvas.style.width = '800px';
        canvas.style.height = '1000px';
        
        // 背景
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // ヘッダー部分
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, 120);
        gradient.addColorStop(0, '#0066CC');
        gradient.addColorStop(1, '#0052A3');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, 120);
        
        // ヘッダーテキスト
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 32px "Noto Sans JP", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('情報科学専門学校', canvas.width / 2, 50);
        ctx.font = '18px "Noto Sans JP", sans-serif';
        ctx.fillText('学校案内 2026 - デモ版', canvas.width / 2, 80);
        ctx.font = '14px "Noto Sans JP", sans-serif';
        ctx.fillText(`ページ ${this.viewer.currentPage} / ${this.demoPages.length}`, canvas.width / 2, 105);
        
        // メインコンテンツエリア
        ctx.fillStyle = '#F8F9FA';
        ctx.fillRect(40, 140, canvas.width - 80, canvas.height - 180);
        
        // ページタイトル
        ctx.fillStyle = '#0066CC';
        ctx.font = 'bold 24px "Noto Sans JP", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(pageData.title, canvas.width / 2, 180);
        
        // コンテンツ
        ctx.fillStyle = '#333333';
        ctx.font = '16px "Noto Sans JP", sans-serif';
        ctx.textAlign = 'left';
        
        let yPosition = 220;
        const lineHeight = 30;
        const maxWidth = canvas.width - 120;
        const startX = 60;
        
        pageData.content.forEach((line, index) => {
            if (yPosition > canvas.height - 100) return; // ページ下部に余白を残す
            
            // 長い行は自動で折り返し
            const words = line.split('');
            let currentLine = '';
            let testLine = '';
            
            for (let n = 0; n < words.length; n++) {
                testLine = currentLine + words[n];
                const metrics = ctx.measureText(testLine);
                const testWidth = metrics.width;
                
                if (testWidth > maxWidth && n > 0) {
                    ctx.fillText(currentLine, startX, yPosition);
                    currentLine = words[n];
                    yPosition += lineHeight;
                } else {
                    currentLine = testLine;
                }
            }
            
            ctx.fillText(currentLine, startX, yPosition);
            yPosition += lineHeight;
        });
        
        // 装飾要素の追加
        this.addDecorations(ctx, canvas, pageData);
        
        // フッター
        ctx.fillStyle = '#666666';
        ctx.font = '12px "Noto Sans JP", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('岩崎学園 情報科学専門学校', canvas.width / 2, canvas.height - 40);
        ctx.fillText('〒221-0835 横浜市神奈川区鶴屋町2-17', canvas.width / 2, canvas.height - 25);
        ctx.fillText('TEL: 045-311-5562', canvas.width / 2, canvas.height - 10);
    }

    addDecorations(ctx, canvas, pageData) {
        // ページタイプに応じた装飾を追加
        const pageType = this.getPageType(pageData.title);
        
        switch (pageType) {
            case 'cover':
                this.addCoverDecorations(ctx, canvas);
                break;
            case 'department':
                this.addDepartmentDecorations(ctx, canvas);
                break;
            case 'support':
                this.addSupportDecorations(ctx, canvas);
                break;
            default:
                this.addGeneralDecorations(ctx, canvas);
        }
    }

    getPageType(title) {
        if (title.includes('表紙') || title.includes('学校案内')) return 'cover';
        if (title.includes('学科') || title.includes('コース')) return 'department';
        if (title.includes('就職') || title.includes('サポート')) return 'support';
        return 'general';
    }

    addCoverDecorations(ctx, canvas) {
        // ISCロゴ風の装飾
        ctx.fillStyle = '#FF6600';
        ctx.fillRect(canvas.width - 150, 200, 80, 60);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px "Arial", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('ISC', canvas.width - 110, 235);
        
        // アクセント線
        ctx.strokeStyle = '#0066CC';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(60, 300);
        ctx.lineTo(canvas.width - 60, 300);
        ctx.stroke();
    }

    addDepartmentDecorations(ctx, canvas) {
        // 学科アイコン風の装飾
        ctx.fillStyle = '#FF6600';
        ctx.beginPath();
        ctx.arc(canvas.width - 100, 220, 30, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px "Arial", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🎓', canvas.width - 100, 230);
    }

    addSupportDecorations(ctx, canvas) {
        // サポートアイコン風の装飾
        ctx.fillStyle = '#34A853';
        ctx.fillRect(canvas.width - 120, 200, 60, 40);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px "Arial", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('✓', canvas.width - 90, 225);
    }

    addGeneralDecorations(ctx, canvas) {
        // 一般的な装飾
        ctx.fillStyle = '#E1E5E9';
        ctx.fillRect(50, 280, 4, 100);
    }

    showError(message) {
        const canvas = this.viewer.canvas;
        const ctx = this.viewer.ctx;
        
        // エラー画面の描画
        canvas.width = 800;
        canvas.height = 600;
        canvas.style.width = '800px';
        canvas.style.height = '600px';
        
        // 背景
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // エラーアイコン
        ctx.fillStyle = '#EA4335';
        ctx.font = 'bold 64px "Arial", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('⚠️', canvas.width / 2, 200);
        
        // エラーメッセージ
        ctx.fillStyle = '#333333';
        ctx.font = 'bold 24px "Noto Sans JP", sans-serif';
        ctx.fillText('PDFの読み込みに失敗しました', canvas.width / 2, 280);
        
        ctx.font = '16px "Noto Sans JP", sans-serif';
        ctx.fillStyle = '#666666';
        ctx.fillText('デモコンテンツを表示しています', canvas.width / 2, 320);
        ctx.fillText('実際の学校案内はより詳細な内容となります', canvas.width / 2, 350);
        
        // 詳細メッセージ
        ctx.font = '14px "Noto Sans JP", sans-serif';
        ctx.fillStyle = '#999999';
        ctx.fillText(message, canvas.width / 2, 400);
        
        // 操作案内
        ctx.fillStyle = '#0066CC';
        ctx.font = '16px "Noto Sans JP", sans-serif';
        ctx.fillText('矢印キーまたはコントロールボタンでページを移動できます', canvas.width / 2, 450);
        
        // 学校情報
        ctx.fillStyle = '#666666';
        ctx.font = '14px "Noto Sans JP", sans-serif';
        ctx.fillText('情報科学専門学校', canvas.width / 2, 520);
        ctx.fillText('〒221-0835 横浜市神奈川区鶴屋町2-17', canvas.width / 2, 540);
        
        // デモ用の設定
        setTimeout(() => {
            this.viewer.totalPages = this.demoPages.length;
            if (this.viewer.totalPagesSpan) {
                this.viewer.totalPagesSpan.textContent = this.viewer.totalPages;
            }
            if (this.viewer.sidebarTotalPages) {
                this.viewer.sidebarTotalPages.textContent = `${this.viewer.totalPages}ページ（デモ）`;
            }
            this.viewer.updateControls();
            
            // 2秒後にデモコンテンツに切り替え
            setTimeout(() => {
                this.showDemoContent();
            }, 2000);
        }, 1000);
        
        // ローディング表示を隠す
        if (this.viewer.loadingIndicator) {
            this.viewer.loadingIndicator.style.display = 'none';
        }
        this.viewer.canvas.style.display = 'block';
        this.viewer.canvas.classList.add('fade-in');
    }

    updateDemoContent() {
        // 現在のページに応じてデモコンテンツを更新
        if (this.viewer.pdf === null) {
            this.showDemoContent();
        }
    }
}

// モジュールが個別に読み込まれない場合のフォールバック
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DemoContent;
}