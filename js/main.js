/**
 * メインPDFビューアークラス
 * 各機能モジュールを統合して管理
 */
class ISCPDFViewer {
    constructor() {
        // 基本プロパティ
        this.currentPage = 1;
        this.totalPages = 0;
        this.scale = 1.0;
        this.baseScale = 1.0;
        this.currentZoom = 1.2; // 初期表示を20%大きく

        // DOM要素への参照
        this.canvas = document.getElementById('pdfCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.pageInput = document.getElementById('pageInput');
        this.totalPagesSpan = document.getElementById('totalPages');
        this.sidebarTotalPages = document.getElementById('sidebarTotalPages');
        this.loadingIndicator = document.getElementById('loadingIndicator');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        this.zoomDisplay = document.getElementById('zoomDisplay');
        this.zoomLevelIndicator = document.getElementById('zoomLevelIndicator');
        this.pdfViewerContainer = document.getElementById('pdfViewerContainer');

        // 機能モジュールの初期化
        this.pdfLoader = new PDFLoader(this);
        this.pageNavigator = new PageNavigator(this);
        this.zoomManager = new ZoomManager(this);
        this.fullscreenManager = new FullscreenManager(this);
        this.contentAnalyzer = new ContentAnalyzer(this);
        this.mobileMenu = new MobileMenu(this);
        this.demoContent = new DemoContent(this);

        // PDFファイルの読み込み開始
        this.loadPDF();
    }

    async loadPDF() {
        // 複数のファイルパスを試行
        const pdfPaths = [
            'pdf/school-guide-2026.pdf',
            './pdf/school-guide-2026.pdf',
            'school-guide-2026.pdf'
        ];
        
        console.log('PDF読み込み開始');
        console.log('現在のURL:', window.location.href);
        
        let success = false;
        
        for (const pdfUrl of pdfPaths) {
            console.log('試行中のPDFパス:', pdfUrl);
            console.log('フルパス:', new URL(pdfUrl, window.location.href).href);
            
            success = await this.pdfLoader.loadPDF(pdfUrl);
            if (success) {
                console.log('PDF読み込み成功:', pdfUrl);
                break;
            }
        }
        
        if (!success) {
            console.log('全てのPDF読み込み失敗、デモコンテンツを表示');
            this.showDemoContent();
        }
    }

    // 共通ユーティリティメソッド
    updateProgress(percentage, text) {
        if (this.progressFill) {
            this.progressFill.style.width = `${Math.min(100, Math.max(0, percentage))}%`;
        }
        if (this.progressText && text) {
            this.progressText.textContent = text;
        }
    }

    updateActiveTocItem() {
        // 全ての目次リンクから active クラスを削除
        document.querySelectorAll('.toc-link').forEach(link => {
            link.classList.remove('active');
        });

        // 現在のページに対応する目次項目をアクティブにする
        const currentLink = document.querySelector(`[data-page="${this.currentPage}"]`);
        if (currentLink) {
            currentLink.classList.add('active');
        }
    }

    updateControls() {
        this.pageNavigator.updateControls();
    }

    updateZoomDisplay() {
        this.zoomManager.updateZoomDisplay();
    }

    showDemoContent() {
        this.demoContent.showDemoContent();
    }

    showError(message) {
        this.demoContent.showError(message);
    }
}

// PDF.jsの設定
pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// アプリケーション開始
document.addEventListener('DOMContentLoaded', () => {
    // フォントの読み込み完了を待つ
    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => {
            new ISCPDFViewer();
        });
    } else {
        new ISCPDFViewer();
    }
});

// サービスワーカー登録（オフライン対応）
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        console.log('Service Worker機能が利用可能です');
    });
}