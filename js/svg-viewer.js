/**
 * SVGビューア - 高性能ベクターファイルビューア
 * 既存のPDFビューアのアーキテクチャを継承し、SVGファイルに最適化
 */
class SVGViewer {
    constructor(viewer) {
        this.viewer = viewer;
        this.svgContainer = null;
        this.currentSVG = null;
        this.svgCache = new Map();
        this.maxCacheSize = 10; // メモリ効率のため制限
        this.preloadQueue = [];
        this.isLoading = false;
        
        console.log('🎨 SVGViewer initialized');
        this.initializeSVGContainer();
    }

    /**
     * SVG表示用コンテナの初期化
     */
    initializeSVGContainer() {
        // 既存のPDFキャンバスを非表示
        if (this.viewer.canvas) {
            this.viewer.canvas.style.display = 'none';
        }

        // SVG表示用のコンテナを作成
        this.svgContainer = document.createElement('div');
        this.svgContainer.id = 'svgContainer';
        this.svgContainer.className = 'svg-container';
        
        // コンテナのスタイル設定
        this.svgContainer.style.cssText = `
            width: 100%;
            height: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
            overflow: hidden;
            background-color: #f5f5f5;
        `;

        // PDFビューアコンテナに追加
        const pdfContainer = this.viewer.pdfViewerContainer;
        if (pdfContainer) {
            pdfContainer.appendChild(this.svgContainer);
        }

        console.log('✅ SVG container initialized');
    }

    /**
     * SVGページの読み込みと表示
     */
    async loadSVGPage(pageNumber) {
        if (this.isLoading) {
            console.log('🔄 Already loading, skipping...');
            return;
        }

        this.isLoading = true;
        console.log(`📄 Loading SVG page ${pageNumber}`);

        try {
            // プログレス表示
            this.viewer.updateProgress(20, `SVGページ ${pageNumber} を読み込み中...`);

            // キャッシュから確認
            const cacheKey = `page-${pageNumber}`;
            if (this.svgCache.has(cacheKey)) {
                console.log(`💾 Cache hit for page ${pageNumber}`);
                this.displaySVG(this.svgCache.get(cacheKey));
                this.viewer.updateProgress(100, `✅ ページ ${pageNumber} 表示完了`);
                return;
            }

            // SVGファイルのパス生成
            const svgPath = this.getSVGPath(pageNumber);
            this.viewer.updateProgress(40, 'SVGファイルを取得中...');

            // SVGファイルの読み込み
            const svgContent = await this.fetchSVG(svgPath);
            this.viewer.updateProgress(70, 'SVGを解析中...');

            // SVG要素の作成と最適化
            const svgElement = this.createOptimizedSVG(svgContent, pageNumber);
            this.viewer.updateProgress(90, 'レンダリング中...');

            // キャッシュに保存
            this.cacheSVG(cacheKey, svgElement.cloneNode(true));

            // 表示
            this.displaySVG(svgElement);
            this.viewer.updateProgress(100, `✅ ページ ${pageNumber} 表示完了`);

            // プリロード開始
            this.schedulePreload(pageNumber);

        } catch (error) {
            console.error(`❌ Failed to load SVG page ${pageNumber}:`, error);
            this.viewer.updateProgress(0, `⚠️ ページ ${pageNumber} の読み込みに失敗`);
            this.showErrorPage(pageNumber, error);
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * SVGファイルパスの生成
     */
    getSVGPath(pageNumber) {
        // ゼロパディングで4桁に調整
        const paddedNumber = pageNumber.toString().padStart(4, '0');
        return `SVG/入案圧縮-${paddedNumber}.svg`;
    }

    /**
     * SVGファイルの非同期取得
     */
    async fetchSVG(svgPath) {
        console.log(`🌐 Fetching SVG: ${svgPath}`);
        
        const response = await fetch(svgPath);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const svgText = await response.text();
        
        // ファイルサイズをログ出力
        const fileSizeMB = (svgText.length / 1024 / 1024).toFixed(2);
        console.log(`📦 SVG loaded: ${fileSizeMB}MB`);
        
        return svgText;
    }

    /**
     * 最適化されたSVG要素の作成
     */
    createOptimizedSVG(svgContent, pageNumber) {
        // DOMParserでSVGを解析
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
        const svgElement = svgDoc.querySelector('svg');

        if (!svgElement) {
            throw new Error('Invalid SVG content');
        }

        // SVG要素の最適化
        this.optimizeSVGElement(svgElement, pageNumber);

        return svgElement;
    }

    /**
     * SVG要素の最適化処理
     */
    optimizeSVGElement(svgElement, pageNumber) {
        // レスポンシブ対応
        svgElement.style.cssText = `
            max-width: 100%;
            max-height: 100%;
            width: auto;
            height: auto;
            display: block;
            margin: 0 auto;
        `;

        // viewBoxの設定（レスポンシブ表示に必要）
        if (!svgElement.getAttribute('viewBox')) {
            const width = svgElement.getAttribute('width') || '800';
            const height = svgElement.getAttribute('height') || '600';
            svgElement.setAttribute('viewBox', `0 0 ${width} ${height}`);
        }

        // 幅と高さの設定を削除（レスポンシブのため）
        svgElement.removeAttribute('width');
        svgElement.removeAttribute('height');

        // アクセシビリティ属性
        svgElement.setAttribute('role', 'img');
        svgElement.setAttribute('aria-label', `学校案内 ページ ${pageNumber}`);

        // パフォーマンス最適化属性
        svgElement.style.shapeRendering = 'geometricPrecision';
        svgElement.style.textRendering = 'optimizeLegibility';

        console.log(`⚡ SVG optimized for page ${pageNumber}`);
    }

    /**
     * SVGの表示
     */
    displaySVG(svgElement) {
        // 既存のSVGをクリア
        this.svgContainer.innerHTML = '';

        // 新しいSVGを追加
        this.svgContainer.appendChild(svgElement.cloneNode(true));
        this.currentSVG = svgElement;

        // フェードインアニメーション
        this.svgContainer.style.opacity = '0';
        this.svgContainer.style.transition = 'opacity 0.3s ease-in-out';
        
        // 次のフレームで表示
        requestAnimationFrame(() => {
            this.svgContainer.style.opacity = '1';
        });

        console.log('✨ SVG displayed successfully');
    }

    /**
     * SVGキャッシュ管理
     */
    cacheSVG(key, svgElement) {
        // キャッシュサイズ制限
        if (this.svgCache.size >= this.maxCacheSize) {
            const firstKey = this.svgCache.keys().next().value;
            this.svgCache.delete(firstKey);
            console.log(`🗑️ Cache evicted: ${firstKey}`);
        }

        this.svgCache.set(key, svgElement);
        console.log(`💾 Cached SVG: ${key} (${this.svgCache.size}/${this.maxCacheSize})`);
    }

    /**
     * プリロードスケジューリング
     */
    schedulePreload(currentPage) {
        // 前後のページをプリロード対象に追加
        const preloadPages = [
            currentPage - 1,
            currentPage + 1,
            currentPage + 2
        ].filter(page => page >= 1 && page <= (this.viewer.totalPages || 30));

        preloadPages.forEach(page => {
            const cacheKey = `page-${page}`;
            if (!this.svgCache.has(cacheKey) && !this.preloadQueue.includes(page)) {
                this.preloadQueue.push(page);
            }
        });

        // プリロード実行
        this.executePreload();
    }

    /**
     * プリロード実行
     */
    async executePreload() {
        if (this.preloadQueue.length === 0 || this.isLoading) return;

        const pageToPreload = this.preloadQueue.shift();
        console.log(`🔄 Preloading page ${pageToPreload}`);

        try {
            const svgPath = this.getSVGPath(pageToPreload);
            const svgContent = await this.fetchSVG(svgPath);
            const svgElement = this.createOptimizedSVG(svgContent, pageToPreload);
            
            const cacheKey = `page-${pageToPreload}`;
            this.cacheSVG(cacheKey, svgElement);
            
            console.log(`✅ Preloaded page ${pageToPreload}`);
        } catch (error) {
            console.warn(`⚠️ Preload failed for page ${pageToPreload}:`, error);
        }

        // 次のプリロードを遅延実行
        setTimeout(() => this.executePreload(), 500);
    }

    /**
     * エラーページの表示
     */
    showErrorPage(pageNumber, error) {
        const errorSVG = `
            <svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
                <rect width="800" height="600" fill="#f8f9fa"/>
                <text x="400" y="250" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="#dc3545">
                    ページ ${pageNumber} の読み込みに失敗しました
                </text>
                <text x="400" y="300" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#6c757d">
                    ${error.message}
                </text>
                <text x="400" y="350" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#868e96">
                    ページを再読み込みするか、他のページをお試しください
                </text>
            </svg>
        `;

        const parser = new DOMParser();
        const errorDoc = parser.parseFromString(errorSVG, 'image/svg+xml');
        const errorElement = errorDoc.querySelector('svg');
        
        this.displaySVG(errorElement);
    }

    /**
     * ズーム対応
     */
    setZoom(zoomLevel) {
        if (this.currentSVG && this.svgContainer) {
            const scale = Math.max(0.3, Math.min(5.0, zoomLevel));
            this.svgContainer.style.transform = `scale(${scale})`;
            this.svgContainer.style.transformOrigin = 'center center';
            
            console.log(`🔍 SVG zoom set to ${(scale * 100).toFixed(0)}%`);
        }
    }

    /**
     * リソースの解放
     */
    destroy() {
        // キャッシュクリア
        this.svgCache.clear();
        this.preloadQueue.length = 0;

        // DOM要素の削除
        if (this.svgContainer) {
            this.svgContainer.remove();
        }

        console.log('🧹 SVGViewer destroyed');
    }
}