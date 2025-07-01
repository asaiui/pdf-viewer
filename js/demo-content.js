/**
 * デモコンテンツ表示機能
 */
class DemoContent {
    constructor(viewer) {
        this.viewer = viewer;
    }

    showDemoContent() {
        // キャンバスサイズを設定（より大きく表示）
        const containerWidth = this.viewer.pdfViewerContainer.clientWidth - 20;
        const targetWidth = Math.max(800, Math.min(containerWidth * 0.9, 1200));
        const targetHeight = Math.max(1000, targetWidth * 1.3);
        
        this.viewer.canvas.width = targetWidth;
        this.viewer.canvas.height = targetHeight;
        this.viewer.canvas.style.width = targetWidth + 'px';
        this.viewer.canvas.style.height = targetHeight + 'px';

        // 背景
        this.viewer.ctx.fillStyle = '#ffffff';
        this.viewer.ctx.fillRect(0, 0, this.viewer.canvas.width, this.viewer.canvas.height);

        // ヘッダー部分
        this.viewer.ctx.fillStyle = '#0066CC';
        this.viewer.ctx.fillRect(0, 0, this.viewer.canvas.width, 120);

        // メインタイトル
        this.viewer.ctx.fillStyle = '#ffffff';
        this.viewer.ctx.font = 'bold 36px "Noto Sans JP", sans-serif';
        this.viewer.ctx.textAlign = 'center';
        this.viewer.ctx.fillText('情報科学専門学校', this.viewer.canvas.width / 2, 60);
        this.viewer.ctx.font = '24px "Noto Sans JP", sans-serif';
        this.viewer.ctx.fillText('学校案内 2026', this.viewer.canvas.width / 2, 95);

        // ページ情報
        this.viewer.ctx.fillStyle = '#333333';
        this.viewer.ctx.font = '18px "Noto Sans JP", sans-serif';
        this.viewer.ctx.fillText(`ページ ${this.viewer.currentPage} / ${this.viewer.totalPages || 57}`, this.viewer.canvas.width / 2, 160);

        // 学校の特色
        this.viewer.ctx.fillStyle = '#FF6600';
        this.viewer.ctx.font = 'bold 20px "Noto Sans JP", sans-serif';
        this.viewer.ctx.fillText('神奈川県初のIT専門学校（1983年創立）', this.viewer.canvas.width / 2, 200);

        // 学科一覧
        this.viewer.ctx.fillStyle = '#333333';
        this.viewer.ctx.font = '16px "Noto Sans JP", sans-serif';
        this.viewer.ctx.textAlign = 'left';

        const sections = [
            '🔒 情報セキュリティ学科（4年制）',
            '🤖 実践AI科（4年制）',
            '🎮 先端ITシステム科（3年制）',
            '💻 情報処理科（2年制）',
            '🌐 実践IoT科（2年制）',
            '🎨 Web技術科（2年制）',
            '📊 ビジネス科（2年制）',
            '📜 ITライセンス科（1年制）'
        ];

        sections.forEach((section, index) => {
            this.viewer.ctx.fillText(section, 60, 280 + (index * 40));
        });

        // 特徴・実績
        this.viewer.ctx.fillStyle = '#0066CC';
        this.viewer.ctx.font = 'bold 18px "Noto Sans JP", sans-serif';
        this.viewer.ctx.textAlign = 'center';
        this.viewer.ctx.fillText('🚉 横浜駅から徒歩1分', this.viewer.canvas.width / 2, 680);
        this.viewer.ctx.fillText('📈 就職率98.9%', this.viewer.canvas.width / 2, 720);
        this.viewer.ctx.fillText('🏆 資格取得サポート充実', this.viewer.canvas.width / 2, 760);
        this.viewer.ctx.fillText('💼 大手企業への就職実績多数', this.viewer.canvas.width / 2, 800);

        // フッター
        this.viewer.ctx.fillStyle = '#666666';
        this.viewer.ctx.font = '14px "Noto Sans JP", sans-serif';
        this.viewer.ctx.fillText('岩崎学園 - 97年の教育実績', this.viewer.canvas.width / 2, 850);
        this.viewer.ctx.fillText('〒221-0835 横浜市神奈川区鶴屋町2-17', this.viewer.canvas.width / 2, 880);

        // デモ表示の場合の総ページ数設定
        if (!this.viewer.totalPages) {
            this.viewer.totalPages = 57;
            this.viewer.totalPagesSpan.textContent = this.viewer.totalPages;
            this.viewer.sidebarTotalPages.textContent = `${this.viewer.totalPages}ページ`;
            this.viewer.pageNavigator.updateControls();
        }
        
        // 初期ズーム表示を更新
        this.viewer.zoomManager.updateZoomDisplay();
    }

    showError(message) {
        this.viewer.loadingIndicator.innerHTML = `
            <div style="color: var(--error); font-size: 24px;">⚠️</div>
            <div class="loading-text" style="color: var(--error);">${message}</div>
            <div class="loading-subtext">デモ表示に切り替えています...</div>
        `;

        setTimeout(() => {
            this.viewer.loadingIndicator.style.display = 'none';
            this.viewer.canvas.style.display = 'block';
            this.viewer.canvas.classList.add('fade-in');
            this.viewer.totalPages = 57; // デモ用総ページ数
            this.viewer.totalPagesSpan.textContent = this.viewer.totalPages;
            this.viewer.sidebarTotalPages.textContent = `${this.viewer.totalPages}ページ（デモ）`;
            this.showDemoContent();
            this.viewer.pageNavigator.updateControls();
        }, 2000);
    }
}