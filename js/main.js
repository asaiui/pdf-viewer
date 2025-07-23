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

        // DOMキャッシュシステムを使用した効率的なDOM管理
        this.dom = window.domCache;
        
        // 重要なDOM要素の遅延初期化設定
        this.initializeDOMReferences();

        // 機能モジュールの初期化
        this.initializeModules();

        // アプリケーション初期化
        this.initializeApp();
    }

    /**
     * DOM参照の初期化（遅延ロード）
     */
    initializeDOMReferences() {
        // 重要な要素はgetterで遅延取得
        Object.defineProperties(this, {
            pageInput: {
                get: () => this.dom.get('pageInput'),
                configurable: true
            },
            totalPagesSpan: {
                get: () => this.dom.get('totalPages'),
                configurable: true
            },
            sidebarTotalPages: {
                get: () => this.dom.get('sidebarTotalPages'),
                configurable: true
            },
            loadingIndicator: {
                get: () => this.dom.get('loadingIndicator'),
                configurable: true
            },
            progressFill: {
                get: () => this.dom.get('progressFill'),
                configurable: true
            },
            progressText: {
                get: () => this.dom.get('progressText'),
                configurable: true
            },
            zoomDisplay: {
                get: () => this.dom.get('zoomDisplay'),
                configurable: true
            },
            zoomLevelIndicator: {
                get: () => this.dom.get('zoomLevelIndicator'),
                configurable: true
            },
            pdfViewerContainer: {
                get: () => this.dom.get('pdfViewerContainer'),
                configurable: true
            },
            svgContainer: {
                get: () => this.dom.get('svgContainer'),
                configurable: true
            },
            currentPageDisplay: {
                get: () => this.dom.get('currentPageDisplay'),
                configurable: true
            },
            loadingStatus: {
                get: () => this.dom.get('loadingStatus'),
                configurable: true
            },
            loadStatus: {
                get: () => this.dom.get('loadStatus'),
                configurable: true
            },
            appLoading: {
                get: () => this.dom.get('appLoading'),
                configurable: true
            }
        });
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
        if (typeof PNGViewer !== 'undefined') {
            this.svgViewer = new PNGViewer(this);
        }
        
        // イベントマネージャーの初期化（全イベント一元管理）
        if (typeof EventManager !== 'undefined') {
            this.eventManager = new EventManager(this);
        }
        
        // 統合タッチハンドラーの初期化（旧モジュールを置き換え）
        if (typeof UnifiedTouchHandler !== 'undefined') {
            this.unifiedTouchHandler = new UnifiedTouchHandler(this);
            // グローバル参照を保存（リサイズイベント用）
            window.unifiedTouchHandler = this.unifiedTouchHandler;
        }
        
        // モバイルUI最適化の初期化
        if (typeof MobileUIOptimizer !== 'undefined') {
            this.mobileUIOptimizer = new MobileUIOptimizer(this);
        }

        // 表示モード管理（SVG専用）
        this.viewMode = 'svg';

        // 内蔵機能の初期化（EventManagerが無い場合のフォールバック）
        if (!this.eventManager) {
            this.initializeBuiltinFeatures();
        }
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

            // WebP専用モードで起動
            this.viewMode = 'webp';
            this.totalPages = 30; // WebPファイル数
            
            setTimeout(() => {
                this.loadWebPMode();
            }, 500);

        } catch (error) {
            this.hideAppLoading();
            this.showError('アプリケーションの初期化に失敗しました。');
        }
    }


    /**
     * WebPモードでの初期化
     */
    async loadWebPMode() {
        this.updateLoadStatus('WebPビューアを初期化中...');

        // 総ページ数を設定
        this.totalPages = 30;
        this.totalPagesSpan.textContent = this.totalPages;
        if (this.sidebarTotalPages) {
            this.sidebarTotalPages.textContent = `${this.totalPages}ページ（WebP）`;
        }

        // コントロールを更新
        this.updateControls();

        // 最初のページを読み込み
        this.hideAppLoading();
        await this.renderPage();

        this.updateLoadStatus('✅ WebPビューアが準備完了');
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

        // WebPビューアでページを読み込み
        if (this.svgViewer) {
            try {
                await this.svgViewer.loadSVGPage(this.currentPage);
                this.updateActiveTocItem();
                this.updateZoomDisplay();
                this.updatePageDisplay();
                return;
            } catch (error) {
                this.showError('WebPページの読み込みに失敗しました');
                return;
            }
        }

        this.showError('WebPビューアが初期化されていません');
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
        // 分割表示モード時の特別なナビゲーション
        if (this.svgViewer && this.svgViewer.splitMode) {
            if (this.svgViewer.splitSide === 'left') {
                // 左側表示中 → 右側表示へ
                this.svgViewer.toggleSplitSide();
                this.updateLoadStatus('📄 右側表示');
                return;
            } else {
                // 右側表示中 → 次のページの左側へ
                this.svgViewer.splitSide = 'left';
                this.svgViewer.updateSplitIndicator();
                this.goToPage(this.currentPage + 1);
                return;
            }
        }
        
        // 通常モード
        this.goToPage(this.currentPage + 1);
    }

    prevPage() {
        // 分割表示モード時の特別なナビゲーション
        if (this.svgViewer && this.svgViewer.splitMode) {
            if (this.svgViewer.splitSide === 'right') {
                // 右側表示中 → 左側表示へ
                this.svgViewer.toggleSplitSide();
                this.updateLoadStatus('📄 左側表示');
                return;
            } else {
                // 左側表示中 → 前のページの右側へ
                this.svgViewer.splitSide = 'right';
                this.svgViewer.updateSplitIndicator();
                this.goToPage(this.currentPage - 1);
                return;
            }
        }
        
        // 通常モード
        this.goToPage(this.currentPage - 1);
    }

    firstPage() {
        this.goToPage(1);
    }

    lastPage() {
        this.goToPage(this.totalPages);
    }

    // ズーム機能（WebP専用）
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
            this.currentZoom = 1.3; // WebPの場合は固定値
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

    // 分割表示機能
    toggleSplitMode() {
        console.log('ISCPDFViewer.toggleSplitMode called'); // デバッグログ
        console.log('svgViewer exists:', !!this.svgViewer); // svgViewerの存在確認
        console.log('svgViewer type:', typeof this.svgViewer); // svgViewerの型確認
        console.log('toggleSplitMode method exists:', typeof this.svgViewer?.toggleSplitMode); // メソッド存在確認
        
        if (this.svgViewer && typeof this.svgViewer.toggleSplitMode === 'function') {
            console.log('Calling svgViewer.toggleSplitMode()');
            const splitMode = this.svgViewer.toggleSplitMode();
            console.log('Split mode result:', splitMode);
            this.updateSplitButton(splitMode);
            this.updateLoadStatus(splitMode ? '📄 分割表示モード' : '📄 通常表示モード');
        } else {
            console.error('分割表示機能が利用できません');
            console.error('svgViewer:', this.svgViewer);
            if (this.svgViewer) {
                console.error('Available methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(this.svgViewer)));
            }
            this.updateLoadStatus('⚠️ 分割表示機能が利用できません');
        }
    }

    toggleSplitSide() {
        if (this.svgViewer && typeof this.svgViewer.toggleSplitSide === 'function') {
            const splitSide = this.svgViewer.toggleSplitSide();
            this.updateLoadStatus(`📄 ${splitSide === 'left' ? '左側' : '右側'}表示`);
        }
    }

    updateSplitButton(splitMode) {
        const splitBtn = this.dom.get('splitBtn');
        if (splitBtn) {
            splitBtn.textContent = splitMode ? '通常' : '分割';
            splitBtn.classList.toggle('active', splitMode);
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

        const firstBtn = this.dom.get('firstPageBtn');
        const prevBtn = this.dom.get('prevPageBtn');
        const nextBtn = this.dom.get('nextPageBtn');
        const lastBtn = this.dom.get('lastPageBtn');

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
        const firstBtn = this.dom.get('firstPageBtn');
        const prevBtn = this.dom.get('prevPageBtn');
        const nextBtn = this.dom.get('nextPageBtn');
        const lastBtn = this.dom.get('lastPageBtn');

        if (firstBtn) firstBtn.addEventListener('click', () => this.firstPage());
        if (prevBtn) prevBtn.addEventListener('click', () => this.prevPage());
        if (nextBtn) nextBtn.addEventListener('click', () => this.nextPage());
        if (lastBtn) lastBtn.addEventListener('click', () => this.lastPage());

        // ズームボタン
        const zoomInBtn = this.dom.get('zoomInBtn');
        const zoomOutBtn = this.dom.get('zoomOutBtn');
        const fitWidthBtn = this.dom.get('fitWidthBtn');
        const fitPageBtn = this.dom.get('fitPageBtn');
        const splitBtn = this.dom.get('splitBtn');
        const fullscreenBtn = this.dom.get('fullscreenBtn');

        if (zoomInBtn) zoomInBtn.addEventListener('click', () => this.zoomIn());
        if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => this.zoomOut());
        if (fitWidthBtn) fitWidthBtn.addEventListener('click', () => this.fitToWidth());
        if (fitPageBtn) fitPageBtn.addEventListener('click', () => this.fitToPage());
        // 分割ボタンのイベント処理はEventManagerで一元管理
        if (splitBtn) {
            console.log('Split button found - event handling managed by EventManager');
        } else {
            console.error('Split button not found in DOM');
        }
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

        // 分割インジケーターのイベント処理はEventManagerで一元管理
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
                case 's':
                case 'S':
                    e.preventDefault();
                    this.toggleSplitMode();
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
        const menuToggle = this.dom.get('menuToggle');
        const sidebar = this.dom.get('sidebar');
        const overlay = this.dom.get('overlay');

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
        const sidebar = this.dom.get('sidebar');
        const overlay = this.dom.get('overlay');
        const menuToggle = this.dom.get('menuToggle');

        if (sidebar && overlay && menuToggle) {
            sidebar.classList.toggle('open');
            overlay.classList.toggle('active');

            const isOpen = sidebar.classList.contains('open');
            menuToggle.setAttribute('aria-expanded', isOpen);
        }
    }

    closeMobileMenu() {
        const sidebar = this.dom.get('sidebar');
        const overlay = this.dom.get('overlay');
        const menuToggle = this.dom.get('menuToggle');

        if (sidebar && overlay && menuToggle) {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
            menuToggle.setAttribute('aria-expanded', 'false');
        }
    }

    showKeyboardHelp() {
        const keyboardHelp = this.dom.get('keyboardHelp');
        if (keyboardHelp) {
            keyboardHelp.style.display = 'flex';
        }
    }

    hideKeyboardHelp() {
        const keyboardHelp = this.dom.get('keyboardHelp');
        if (keyboardHelp) {
            keyboardHelp.style.display = 'none';
        }
    }

    // アプリケーションのクリーンアップ
    cleanup() {
        if (this.eventManager) {
            this.eventManager.cleanup();
        }
        
        if (this.unifiedTouchHandler) {
            this.unifiedTouchHandler.destroy();
        }
        
        if (this.dom) {
            this.dom.destroy();
        }
        
        // タイマーのクリア
        if (this.navigationTimeout) {
            clearTimeout(this.navigationTimeout);
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
            const registration = await navigator.serviceWorker.register('./sw-advanced.js');

            console.log('Advanced Service Worker registered:', registration);

            // WebPファイルのプリロード通知
            if (registration.active) {
                const pngFiles = [];
                for (let i = 1; i <= 30; i++) {
                    const paddedNumber = i.toString().padStart(2, '0');
                    pngFiles.push(`./IMG/PNG/school-guide-2026_ページ_${paddedNumber}.png`);
                }
                
                registration.active.postMessage({
                    type: 'PRELOAD_PNG',
                    fileList: pngFiles.slice(0, 5) // 最初の5ファイルをプリロード
                });
            }

        } catch (error) {
            console.error('Service Worker registration failed:', error);
        }
    });
}