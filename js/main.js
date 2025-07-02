/**
 * 情報科学専門学校 PDFビューア メインアプリケーション
 * 各機能モジュールを統合して管理
 */
class ISCPDFViewer {
    constructor() {
        // 基本プロパティ
        this.pdf = null;
        this.currentPage = 1;
        this.totalPages = 0;
        this.scale = 1.0;
        this.baseScale = 1.0;
        this.currentZoom = 1.2;
        this.isLoading = false;
        this.navigationTimeout = null;

        // DOM要素への参照
        this.canvas = document.getElementById('pdfCanvas');
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        this.pageInput = document.getElementById('pageInput');
        this.totalPagesSpan = document.getElementById('totalPages');
        this.sidebarTotalPages = document.getElementById('sidebarTotalPages');
        this.loadingIndicator = document.getElementById('loadingIndicator');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        this.zoomDisplay = document.getElementById('zoomDisplay');
        this.zoomLevelIndicator = document.getElementById('zoomLevelIndicator');
        this.pdfViewerContainer = document.getElementById('pdfViewerContainer');
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
        
        // 機能モジュールが存在する場合のみ初期化
        if (typeof PDFLoader !== 'undefined') {
            this.pdfLoader = new PDFLoader(this);
        }
        if (typeof ProgressiveLoader !== 'undefined') {
            this.progressiveLoader = new ProgressiveLoader(this);
        }
        if (typeof PerformanceMonitor !== 'undefined') {
            this.performanceMonitor = new PerformanceMonitor(this);
        }
        if (typeof ParallelRenderer !== 'undefined') {
            this.parallelRenderer = new ParallelRenderer(this);
        }
        if (typeof PageNavigator !== 'undefined') {
            this.pageNavigator = new PageNavigator(this);
        }
        if (typeof ZoomManager !== 'undefined') {
            this.zoomManager = new ZoomManager(this);
        }
        if (typeof FullscreenManager !== 'undefined') {
            this.fullscreenManager = new FullscreenManager(this);
        }
        if (typeof ContentAnalyzer !== 'undefined') {
            this.contentAnalyzer = new ContentAnalyzer(this);
        }
        if (typeof MobileMenu !== 'undefined') {
            this.mobileMenu = new MobileMenu(this);
        }
        if (typeof DemoContent !== 'undefined') {
            this.demoContent = new DemoContent(this);
        }
        if (typeof IntelligentPrefetch !== 'undefined') {
            this.intelligentPrefetch = new IntelligentPrefetch(this);
        }
        if (typeof RealtimeDashboard !== 'undefined') {
            this.realtimeDashboard = new RealtimeDashboard(this);
        }
        if (typeof AdaptiveQualityManager !== 'undefined') {
            this.adaptiveQuality = new AdaptiveQualityManager(this);
        }

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
            
            // 少し待ってからPDF読み込み開始
            setTimeout(() => {
                this.loadPDF();
            }, 1000);
            
        } catch (error) {
            console.error('アプリケーション初期化エラー:', error);
            this.hideAppLoading();
            this.showError('アプリケーションの初期化に失敗しました。');
        }
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

    async loadPDF() {
        // 複数のファイルパスを試行
        const pdfPaths = [
            'pdf/school-guide-2026.pdf',
            './pdf/school-guide-2026.pdf',
            'school-guide-2026.pdf',
            'pdf/250307_学校案内2026最終データ_A3見開き_情報科学専門学校様 (1).pdf'
        ];
        
        console.log('PDF読み込み開始');
        this.updateLoadStatus('PDF読み込み開始');
        
        let success = false;
        
        for (let i = 0; i < pdfPaths.length; i++) {
            const pdfUrl = pdfPaths[i];
            console.log(`試行中のPDFパス (${i + 1}/${pdfPaths.length}):`, pdfUrl);
            
            this.updateProgress((i / pdfPaths.length) * 50, `PDFファイルを検索中... (${i + 1}/${pdfPaths.length})`);
            
            success = await this.loadPDFFile(pdfUrl);
            if (success) {
                console.log('PDF読み込み成功:', pdfUrl);
                break;
            }
        }
        
        this.hideAppLoading();
        
        if (!success) {
            console.log('全てのPDF読み込み失敗、デモコンテンツを表示');
            this.showDemoContent();
        }
    }

    async loadPDFFile(pdfUrl) {
        try {
            console.log('📖 Starting PDF load from:', pdfUrl);
            this.updateProgress(60, 'PDFを解析中...');
            
            const pdf = await pdfjsLib.getDocument(pdfUrl).promise;
            this.pdf = pdf;
            this.totalPages = pdf.numPages;
            
            // PDFLoaderにPDFインスタンスを設定
            if (this.pdfLoader) {
                this.pdfLoader.pdf = pdf;
            }
            
            console.log('📄 PDF loaded successfully. Pages:', this.totalPages);
            this.updateProgress(80, 'ページ情報を取得中...');
            
            // UI更新
            this.totalPagesSpan.textContent = this.totalPages;
            if (this.sidebarTotalPages) {
                this.sidebarTotalPages.textContent = `${this.totalPages}ページ`;
            }
            
            this.updateProgress(90, '最初のページをレンダリング中...');
            
            // ローディング表示を隠してキャンバスを表示
            if (this.loadingIndicator) {
                this.loadingIndicator.style.display = 'none';
            }
            this.canvas.style.display = 'block';
            this.canvas.classList.add('fade-in');
            
            // プログレッシブローディングの開始
            if (this.progressiveLoader) {
                console.log('🔄 Starting progressive loading...');
                await this.progressiveLoader.loadPDFProgressive(pdf);
            }
            
            // 最初のページをレンダリング
            console.log('🎨 Rendering first page...');
            await this.renderPage();
            this.updateControls();
            
            this.updateProgress(100, '読み込み完了');
            this.updateLoadStatus('✅ 学校案内PDFを表示中（プログレッシブ対応）');
            console.log('🎉 PDF initialization completed successfully');
            
            return true;
            
        } catch (error) {
            console.error('PDF読み込みエラー:', error);
            return false;
        }
    }

    async renderPage() {
        console.log('🎨 renderPage called - PDF:', !!this.pdf, 'PDFLoader:', !!this.pdfLoader, 'currentPage:', this.currentPage);
        
        // PDFLoaderが利用可能な場合は優先使用
        if (this.pdfLoader && this.pdf) {
            try {
                console.log('📋 Using PDFLoader for rendering page', this.currentPage);
                await this.pdfLoader.renderPage(this.currentPage);
                this.updateActiveTocItem();
                this.updateZoomDisplay();
                this.updatePageDisplay();
                console.log('✅ PDFLoader rendering completed');
                return;
            } catch (error) {
                console.warn('PDFLoader renderPage failed, trying fallback:', error);
            }
        }

        // フォールバック: 内蔵レンダリング
        if (!this.pdf || this.isLoading) {
            // PDFが読み込まれていない場合はデモを表示しない
            if (!this.pdf) {
                console.warn('PDF not loaded, skipping render');
                return;
            }
            console.warn('Currently loading, skipping render');
            return;
        }
        
        console.log('🔄 Using fallback rendering for page', this.currentPage);

        try {
            this.isLoading = true;
            
            const page = await this.pdf.getPage(this.currentPage);
            const container = this.pdfViewerContainer;
            const containerWidth = container.clientWidth - 40;
            const containerHeight = container.clientHeight - 40;
            
            const viewport = page.getViewport({ scale: 1.0 });
            
            // 自動スケール計算
            const scaleWidth = containerWidth / viewport.width;
            const scaleHeight = containerHeight / viewport.height;
            this.baseScale = Math.min(scaleWidth, scaleHeight) * 0.9;
            this.scale = this.baseScale * this.currentZoom;
            
            const scaledViewport = page.getViewport({ scale: this.scale });
            
            // Canvas解像度を高める（Retina対応）
            const outputScale = window.devicePixelRatio || 1;
            this.canvas.width = Math.floor(scaledViewport.width * outputScale);
            this.canvas.height = Math.floor(scaledViewport.height * outputScale);
            this.canvas.style.width = Math.floor(scaledViewport.width) + 'px';
            this.canvas.style.height = Math.floor(scaledViewport.height) + 'px';
            
            const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;
            
            const renderContext = {
                canvasContext: this.ctx,
                viewport: scaledViewport,
                transform: transform
            };
            
            await page.render(renderContext).promise;
            
            // UI更新
            this.updateActiveTocItem();
            this.updateZoomDisplay();
            this.updatePageDisplay();
            
        } catch (error) {
            console.error('ページ描画エラー:', error);
            // PDFが正常に読み込まれている場合はデモを表示しない
            if (this.pdf && this.currentPage <= this.totalPages) {
                console.warn(`Failed to render page ${this.currentPage}, but PDF is loaded. Retrying...`);
                // 少し待ってからリトライ（最大3回）
                if (!this.retryCount) this.retryCount = 0;
                if (this.retryCount < 3) {
                    this.retryCount++;
                    setTimeout(() => {
                        if (this.pdf) {
                            console.log(`🔄 Retry attempt ${this.retryCount} for page ${this.currentPage}`);
                            this.renderPage();
                        }
                    }, 100 * this.retryCount);
                } else {
                    console.error('Maximum retry attempts reached, giving up');
                    this.retryCount = 0;
                }
            } else {
                // PDFが読み込まれていない場合のみデモを表示
                console.error('PDF not loaded or invalid page, showing demo content');
                this.showDemoContent();
            }
        } finally {
            this.isLoading = false;
        }
    }

    showDemoContent() {
        // デモコンテンツの表示
        this.canvas.width = 800;
        this.canvas.height = 1000;
        this.canvas.style.width = '800px';
        this.canvas.style.height = '1000px';
        
        // 背景
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // ヘッダー部分
        this.ctx.fillStyle = '#0066CC';
        this.ctx.fillRect(0, 0, this.canvas.width, 120);
        
        // メインタイトル
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 36px "Noto Sans JP", sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('情報科学専門学校', this.canvas.width / 2, 60);
        this.ctx.font = '24px "Noto Sans JP", sans-serif';
        this.ctx.fillText('学校案内 2026', this.canvas.width / 2, 95);
        
        // ページ情報
        this.ctx.fillStyle = '#333333';
        this.ctx.font = '18px "Noto Sans JP", sans-serif';
        this.ctx.fillText(`ページ ${this.currentPage} / ${this.totalPages || 50}`, this.canvas.width / 2, 160);
        
        // 学校の特色
        this.ctx.fillStyle = '#FF6600';
        this.ctx.font = 'bold 20px "Noto Sans JP", sans-serif';
        this.ctx.fillText('神奈川県初のIT専門学校（1983年創立）', this.canvas.width / 2, 200);
        
        // 学科一覧
        this.ctx.fillStyle = '#333333';
        this.ctx.font = '16px "Noto Sans JP", sans-serif';
        this.ctx.textAlign = 'left';
        
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
            this.ctx.fillText(section, 60, 280 + (index * 40));
        });
        
        // 特徴・実績
        this.ctx.fillStyle = '#0066CC';
        this.ctx.font = 'bold 18px "Noto Sans JP", sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('🚉 横浜駅から徒歩1分', this.canvas.width / 2, 680);
        this.ctx.fillText('📈 就職率98.9%', this.canvas.width / 2, 720);
        this.ctx.fillText('🏆 資格取得サポート充実', this.canvas.width / 2, 760);
        this.ctx.fillText('💼 大手企業への就職実績多数', this.canvas.width / 2, 800);
        
        // フッター
        this.ctx.fillStyle = '#666666';
        this.ctx.font = '14px "Noto Sans JP", sans-serif';
        this.ctx.fillText('岩崎学園 - 97年の教育実績', this.canvas.width / 2, 850);
        this.ctx.fillText('〒221-0835 横浜市神奈川区鶴屋町2-17', this.canvas.width / 2, 880);
        
        // デモ表示の場合の総ページ数設定
        if (!this.totalPages) {
            this.totalPages = 50;
            this.totalPagesSpan.textContent = this.totalPages;
            if (this.sidebarTotalPages) {
                this.sidebarTotalPages.textContent = `${this.totalPages}ページ（デモ）`;
            }
            this.updateControls();
        }
        
        // ローディング表示を隠す
        if (this.loadingIndicator) {
            this.loadingIndicator.style.display = 'none';
        }
        this.canvas.style.display = 'block';
        this.canvas.classList.add('fade-in');
    }

    // ページナビゲーション機能（デバウンス付き）
    goToPage(pageNumber, immediate = false) {
        console.log(`🎯 goToPage called: pageNumber=${pageNumber}, immediate=${immediate}, PDF loaded=${!!this.pdf}, totalPages=${this.totalPages}`);
        
        // PDFが読み込まれていない場合でもページ表示は可能（デモコンテンツ）
        if (!this.pdf && !this.totalPages) {
            console.warn('PDF not loaded and no demo pages, cannot navigate to page', pageNumber);
            return;
        }
        
        const maxPages = this.totalPages || 50;
        const newPage = Math.max(1, Math.min(pageNumber, maxPages));
        
        console.log(`📍 Page navigation: currentPage=${this.currentPage} -> newPage=${newPage} (max=${maxPages})`);
        
        if (newPage === this.currentPage) {
            console.log('📍 Already on the same page, skipping navigation');
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
            console.log(`🎨 Executing render for page ${this.currentPage}`);
            
            // 現在のレンダリングをキャンセル
            if (this.pdfLoader && this.pdfLoader.currentRenderTask) {
                this.pdfLoader.currentRenderTask.cancel();
            }
            
            // 新しいページをレンダリング
            this.renderPage();
            
            // プログレッシブローダーに現在ページ変更を通知
            if (this.progressiveLoader) {
                this.progressiveLoader.scheduleAdjacentPreload();
            }
        };
        
        if (immediate) {
            console.log('⚡ Immediate render requested');
            executeRender();
        } else {
            console.log('⏱️ Debounced render scheduled (100ms)');
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
        this.goToPage(this.totalPages || 50);
    }

    // ズーム機能
    zoomIn() {
        this.currentZoom = Math.min(this.currentZoom * 1.2, 3.0);
        this.renderPage();
        this.updateLoadStatus('🔍 拡大表示中');
    }

    zoomOut() {
        this.currentZoom = Math.max(this.currentZoom / 1.2, 0.5);
        this.renderPage();
        this.updateLoadStatus('🔍 縮小表示中');
    }

    fitToWidth() {
        if (this.canvas.width > 0) {
            const container = this.pdfViewerContainer;
            this.currentZoom = (container.clientWidth - 40) / (this.canvas.width / (window.devicePixelRatio || 1)) * this.currentZoom;
            this.renderPage();
            this.updateLoadStatus('📐 幅に合わせて表示');
        }
    }

    fitToPage() {
        this.currentZoom = 1.0;
        this.renderPage();
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
        const isLastPage = this.currentPage === (this.totalPages || 50);
        
        const firstBtn = document.getElementById('firstPageBtn');
        const prevBtn = document.getElementById('prevPageBtn');
        const nextBtn = document.getElementById('nextPageBtn');
        const lastBtn = document.getElementById('lastPageBtn');
        
        if (firstBtn) firstBtn.disabled = isFirstPage;
        if (prevBtn) prevBtn.disabled = isFirstPage;
        if (nextBtn) nextBtn.disabled = isLastPage;
        if (lastBtn) lastBtn.disabled = isLastPage;
        
        if (this.pageInput) {
            this.pageInput.max = this.totalPages || 50;
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
        console.error(message);
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
                    console.log('🔗 TOC clicked - Target:', target.tagName, 'Page:', pageNumber, 'Link element:', linkElement);
                } else {
                    console.warn('⚠️ TOC click - No page number found', target);
                    return;
                }
                
                if (pageNumber && !isNaN(pageNumber)) {
                    console.log(`📖 Navigating to page ${pageNumber} from TOC`);
                    this.goToPage(pageNumber, true); // immediateフラグを設定
                    this.closeMobileMenu();
                } else {
                    console.warn('⚠️ Invalid page number:', pageNumber);
                }
            });
        });
    }

    initializeKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // 入力フィールドにフォーカスがある場合は無視
            if (e.target.tagName === 'INPUT') return;
            
            switch(e.key) {
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

        // マウスホイールでのズーム（Ctrl押下時）
        this.canvas.addEventListener('wheel', (e) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                if (e.deltaY < 0) {
                    this.zoomIn();
                } else {
                    this.zoomOut();
                }
            }
        });
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

// サービスワーカー登録（オフライン対応・キャッシュ最適化）
if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            const registration = await navigator.serviceWorker.register('./sw.js');
            console.log('Service Worker registered successfully:', registration);
            
            // PDF読み込み後にキャッシュ通知
            if (registration.active) {
                registration.active.postMessage({
                    type: 'CACHE_PDF',
                    url: window.location.origin + '/pdf/school-guide-2026.pdf'
                });
            }
            
            // バックグラウンド同期の登録
            if ('sync' in window.ServiceWorkerRegistration.prototype) {
                await registration.sync.register('pdf-preload');
            }
            
        } catch (error) {
            console.warn('Service Worker registration failed:', error);
        }
    });
}