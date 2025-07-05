/**
 * 情報科学専門学校 PDFビューア メインアプリケーション
 * 各機能モジュールを統合して管理
 */
class ISCPDFViewer {
    constructor() {
        // 基本プロパティ（SVG専用）
        this.currentPage = 1;
        this.totalPages = 30; // SVGファイル数
        this.currentZoom = 1.2;
        this.isLoading = false;
        this.navigationTimeout = null;

        // DOM要素への参照（SVG専用）
        this.pageInput = document.getElementById('pageInput');
        this.totalPagesSpan = document.getElementById('totalPages');
        this.sidebarTotalPages = document.getElementById('sidebarTotalPages');
        this.loadingIndicator = document.getElementById('loadingIndicator');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        this.zoomDisplay = document.getElementById('zoomDisplay');
        this.zoomLevelIndicator = document.getElementById('zoomLevelIndicator');
        this.pdfViewerContainer = document.getElementById('pdfViewerContainer');
        this.svgContainer = document.getElementById('svgContainer');
        this.currentPageDisplay = document.getElementById('currentPageDisplay');
        this.loadingStatus = document.getElementById('loadingStatus');
        this.loadStatus = document.getElementById('loadStatus');
        this.appLoading = document.getElementById('appLoading');

        // 機能モジュールの初期化
        this.initializeModules();

        // アプリケーション初期化
        this.initializeApp();
    }

    initializeModules() {
        // CDN マネージャーを最初に初期化
        if (typeof CDNManager !== 'undefined') {
            this.cdnManager = new CDNManager();
        }

        // PageNavigatorはmain.js内で処理するため無効化
        // if (typeof PageNavigator !== 'undefined') {
        //     this.pageNavigator = new PageNavigator(this);
        // }
        // ZoomManagerはSVGViewer内で処理するため無効化
        // if (typeof ZoomManager !== 'undefined') {
        //     this.zoomManager = new ZoomManager(this);
        // }
        if (typeof FullscreenManager !== 'undefined') {
            this.fullscreenManager = new FullscreenManager(this);
        }
        if (typeof ContentAnalyzer !== 'undefined') {
            this.contentAnalyzer = new ContentAnalyzer(this);
        }
        if (typeof MobileMenu !== 'undefined') {
            this.mobileMenu = new MobileMenu(this);
        }
        if (typeof SVGViewer !== 'undefined') {
            this.svgViewer = new SVGViewer(this);
        }

        // 表示モード管理（SVG専用）
        this.viewMode = 'svg';

        // 内蔵機能の初期化
        this.initializeBuiltinFeatures();
    }

    initializeBuiltinFeatures() {
        // イベントリスナーの設定
        this.initializeEventListeners();

        // キーボードショートカット
        this.initializeKeyboardShortcuts();

        // リサイズ対応
        this.initializeResizeHandling();

        // モバイルメニュー（内蔵版）
        this.initializeMobileMenuBuiltin();
    }

    async initializeApp() {
        try {
            // アプリローディングを表示
            this.showAppLoading();

            // SVG専用モードで起動
            this.viewMode = 'svg';
            this.totalPages = 30; // SVGファイル数
            
            setTimeout(() => {
                this.loadSVGMode();
            }, 500);

        } catch (error) {
            this.hideAppLoading();
            this.showError('アプリケーションの初期化に失敗しました。');
        }
    }


    /**
     * SVGモードでの初期化
     */
    async loadSVGMode() {
        this.updateLoadStatus('SVGビューアを初期化中...');

        // 総ページ数を設定
        this.totalPages = 30;
        this.totalPagesSpan.textContent = this.totalPages;
        if (this.sidebarTotalPages) {
            this.sidebarTotalPages.textContent = `${this.totalPages}ページ（SVG）`;
        }

        // コントロールを更新
        this.updateControls();

        // 最初のページを読み込み
        this.hideAppLoading();
        await this.renderPage();

        this.updateLoadStatus('✅ SVGビューアが準備完了');
    }

    showAppLoading() {
        if (this.appLoading) {
            this.appLoading.style.display = 'flex';
        }
    }

    hideAppLoading() {
        if (this.appLoading) {
            this.appLoading.classList.add('hidden');
            setTimeout(() => {
                this.appLoading.style.display = 'none';
            }, 500);
        }
    }



    async renderPage() {

        // SVGビューアでページを読み込み
        if (this.svgViewer) {
            try {
                await this.svgViewer.loadSVGPage(this.currentPage);
                this.updateActiveTocItem();
                this.updateZoomDisplay();
                this.updatePageDisplay();
                return;
            } catch (error) {
                this.showError('SVGページの読み込みに失敗しました');
                return;
            }
        }

        this.showError('SVGビューアが初期化されていません');
    }


    // ページナビゲーション機能（デバウンス付き）
    goToPage(pageNumber, immediate = false) {

        // ページ数チェック
        if (!this.totalPages) {
            return;
        }

        const maxPages = this.totalPages;
        const newPage = Math.max(1, Math.min(pageNumber, maxPages));


        if (newPage === this.currentPage) {
            return;
        }

        // 前回のナビゲーションタイマーをクリア
        if (this.navigationTimeout) {
            clearTimeout(this.navigationTimeout);
        }

        // ページ番号を即座に更新（UI の応答性向上）
        this.currentPage = newPage;
        this.pageInput.value = this.currentPage;
        this.updateControls();
        this.updatePageDisplay();
        this.updateLoadStatus(`📄 ページ ${this.currentPage} を表示中`);

        // レンダリングはデバウンスして実行（連続操作時の負荷軽減）
        const executeRender = () => {
            // 新しいページをレンダリング
            this.renderPage();
        };

        if (immediate) {
            executeRender();
        } else {
            // 100ms後にレンダリング実行（デバウンス）
            this.navigationTimeout = setTimeout(executeRender, 100);
        }
    }

    nextPage() {
        this.goToPage(this.currentPage + 1);
    }

    prevPage() {
        this.goToPage(this.currentPage - 1);
    }

    firstPage() {
        this.goToPage(1);
    }

    lastPage() {
        this.goToPage(this.totalPages);
    }

    // ズーム機能（SVG専用）
    zoomIn() {
        if (this.svgViewer) {
            this.currentZoom = Math.min(this.currentZoom * 1.2, 5.0);
            this.svgViewer.setZoom(this.currentZoom);
            this.updateZoomDisplay();
        }
        this.updateLoadStatus('🔍 拡大表示中');
    }

    zoomOut() {
        if (this.svgViewer) {
            this.currentZoom = Math.max(this.currentZoom / 1.2, 0.3);
            this.svgViewer.setZoom(this.currentZoom);
            this.updateZoomDisplay();
        }
        this.updateLoadStatus('🔍 縮小表示中');
    }

    fitToWidth() {
        if (this.svgViewer) {
            this.currentZoom = 1.3; // SVGの場合は固定値
            this.svgViewer.setZoom(this.currentZoom);
            this.updateZoomDisplay();
        }
        this.updateLoadStatus('📐 幅に合わせて表示');
    }

    fitToPage() {
        if (this.svgViewer) {
            this.currentZoom = 1.0;
            this.svgViewer.setZoom(this.currentZoom);
            this.updateZoomDisplay();
        }
        this.updateLoadStatus('📱 全体表示');
    }

    // 全画面表示
    toggleFullscreen() {
        if (!document.fullscreenElement) {
            this.pdfViewerContainer.requestFullscreen();
            this.pdfViewerContainer.classList.add('fullscreen');
        } else {
            document.exitFullscreen();
            this.pdfViewerContainer.classList.remove('fullscreen');
        }
    }

    // ユーティリティメソッド
    updateProgress(percentage, text) {
        if (this.progressFill) {
            this.progressFill.style.width = `${Math.min(100, Math.max(0, percentage))}%`;
        }
        if (this.progressText && text) {
            this.progressText.textContent = text;
        }
    }

    updateLoadStatus(status) {
        if (this.loadStatus) {
            this.loadStatus.textContent = status;
        }
        if (this.loadingStatus) {
            this.loadingStatus.textContent = status.replace(/[🔍📥📄✅⚠️]/g, '').trim();
        }
    }

    updateActiveTocItem() {
        document.querySelectorAll('.toc-link').forEach(link => {
            link.classList.remove('active');
        });

        const currentLink = document.querySelector(`[data-page="${this.currentPage}"]`);
        if (currentLink) {
            currentLink.classList.add('active');
        }
    }

    updateControls() {
        const isFirstPage = this.currentPage === 1;
        const isLastPage = this.currentPage === this.totalPages;

        const firstBtn = document.getElementById('firstPageBtn');
        const prevBtn = document.getElementById('prevPageBtn');
        const nextBtn = document.getElementById('nextPageBtn');
        const lastBtn = document.getElementById('lastPageBtn');

        if (firstBtn) firstBtn.disabled = isFirstPage;
        if (prevBtn) prevBtn.disabled = isFirstPage;
        if (nextBtn) nextBtn.disabled = isLastPage;
        if (lastBtn) lastBtn.disabled = isLastPage;

        if (this.pageInput) {
            this.pageInput.max = this.totalPages;
            this.pageInput.value = this.currentPage;
        }
    }

    updateZoomDisplay() {
        const zoomPercentage = Math.round(this.currentZoom * 100);
        if (this.zoomDisplay) {
            this.zoomDisplay.textContent = `${zoomPercentage}%`;
        }
        if (this.zoomLevelIndicator) {
            this.zoomLevelIndicator.textContent = `${zoomPercentage}%`;
        }
    }

    updatePageDisplay() {
        if (this.currentPageDisplay) {
            this.currentPageDisplay.textContent = this.currentPage;
        }
    }

    showError(message) {
        this.updateLoadStatus('⚠️ エラーが発生しました');
    }

    // イベントリスナーの初期化
    initializeEventListeners() {
        // ページ移動ボタン
        const firstBtn = document.getElementById('firstPageBtn');
        const prevBtn = document.getElementById('prevPageBtn');
        const nextBtn = document.getElementById('nextPageBtn');
        const lastBtn = document.getElementById('lastPageBtn');

        if (firstBtn) firstBtn.addEventListener('click', () => this.firstPage());
        if (prevBtn) prevBtn.addEventListener('click', () => this.prevPage());
        if (nextBtn) nextBtn.addEventListener('click', () => this.nextPage());
        if (lastBtn) lastBtn.addEventListener('click', () => this.lastPage());

        // ズームボタン
        const zoomInBtn = document.getElementById('zoomInBtn');
        const zoomOutBtn = document.getElementById('zoomOutBtn');
        const fitWidthBtn = document.getElementById('fitWidthBtn');
        const fitPageBtn = document.getElementById('fitPageBtn');
        const fullscreenBtn = document.getElementById('fullscreenBtn');

        if (zoomInBtn) zoomInBtn.addEventListener('click', () => this.zoomIn());
        if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => this.zoomOut());
        if (fitWidthBtn) fitWidthBtn.addEventListener('click', () => this.fitToWidth());
        if (fitPageBtn) fitPageBtn.addEventListener('click', () => this.fitToPage());
        if (fullscreenBtn) fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());

        // ページ入力
        if (this.pageInput) {
            this.pageInput.addEventListener('change', (e) => {
                const pageNumber = parseInt(e.target.value);
                if (!isNaN(pageNumber)) {
                    this.goToPage(pageNumber);
                }
            });

            this.pageInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    const pageNumber = parseInt(e.target.value);
                    if (!isNaN(pageNumber)) {
                        this.goToPage(pageNumber);
                    }
                }
            });
        }

        // 目次リンク（統一的な処理）
        document.querySelectorAll('.toc-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();

                // より確実にdata-page属性を取得
                let pageNumber;
                const target = e.target;
                const linkElement = target.closest('.toc-link');

                if (linkElement && linkElement.dataset.page) {
                    pageNumber = parseInt(linkElement.dataset.page);
                } else {
                    return;
                }

                if (pageNumber && !isNaN(pageNumber)) {
                    this.goToPage(pageNumber, true); // immediateフラグを設定
                    this.closeMobileMenu();
                } else {
                }
            });
        });
    }

    initializeKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // 入力フィールドにフォーカスがある場合は無視
            if (e.target.tagName === 'INPUT') return;

            switch (e.key) {
                case 'ArrowLeft':
                case 'ArrowUp':
                case 'PageUp':
                    e.preventDefault();
                    this.prevPage();
                    break;
                case 'ArrowRight':
                case 'ArrowDown':
                case 'PageDown':
                case ' ': // スペースキー
                    e.preventDefault();
                    this.nextPage();
                    break;
                case 'Home':
                    e.preventDefault();
                    this.firstPage();
                    break;
                case 'End':
                    e.preventDefault();
                    this.lastPage();
                    break;
                case '+':
                case '=':
                    e.preventDefault();
                    this.zoomIn();
                    break;
                case '-':
                case '_':
                    e.preventDefault();
                    this.zoomOut();
                    break;
                case 'f':
                case 'F':
                    e.preventDefault();
                    this.fitToPage();
                    break;
                case 'w':
                case 'W':
                    e.preventDefault();
                    this.fitToWidth();
                    break;
                case 'F11':
                    e.preventDefault();
                    this.toggleFullscreen();
                    break;
                case '?':
                    e.preventDefault();
                    this.showKeyboardHelp();
                    break;
                case 'Escape':
                    this.hideKeyboardHelp();
                    this.closeMobileMenu();
                    if (document.fullscreenElement) {
                        document.exitFullscreen();
                    }
                    break;
            }
        });
    }

    initializeResizeHandling() {
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.renderPage();
            }, 250);
        });

        // マウスホイールでのズーム処理はZoomManagerで統一管理
    }

    initializeMobileMenuBuiltin() {
        const menuToggle = document.getElementById('menuToggle');
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('overlay');

        if (menuToggle) {
            menuToggle.addEventListener('click', () => {
                this.toggleMobileMenu();
            });
        }

        if (overlay) {
            overlay.addEventListener('click', () => {
                this.closeMobileMenu();
            });
        }
    }

    toggleMobileMenu() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('overlay');
        const menuToggle = document.getElementById('menuToggle');

        if (sidebar && overlay && menuToggle) {
            sidebar.classList.toggle('open');
            overlay.classList.toggle('active');

            const isOpen = sidebar.classList.contains('open');
            menuToggle.setAttribute('aria-expanded', isOpen);
        }
    }

    closeMobileMenu() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('overlay');
        const menuToggle = document.getElementById('menuToggle');

        if (sidebar && overlay && menuToggle) {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
            menuToggle.setAttribute('aria-expanded', 'false');
        }
    }

    showKeyboardHelp() {
        const keyboardHelp = document.getElementById('keyboardHelp');
        if (keyboardHelp) {
            keyboardHelp.style.display = 'flex';
        }
    }

    hideKeyboardHelp() {
        const keyboardHelp = document.getElementById('keyboardHelp');
        if (keyboardHelp) {
            keyboardHelp.style.display = 'none';
        }
    }
}

// SVGビューア専用アプリケーション

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

// サービスワーカー登録（オフライン対応・キャッシュ最適化）
if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            const registration = await navigator.serviceWorker.register('./sw.js');

            // SVGファイルのキャッシュ通知
            if (registration.active) {
                registration.active.postMessage({
                    type: 'CACHE_SVG',
                    totalFiles: 30
                });
            }

        } catch (error) {
        }
    });
}