/**
 * Progressive Loading Manager
 * PDFページの段階的読み込みとメモリ最適化
 */
class ProgressiveLoader {
    constructor(viewer) {
        this.viewer = viewer;
        this.loadedPages = new Map(); // ページキャッシュ
        this.loadingQueue = new Set(); // 読み込み中のページ
        this.preloadQueue = []; // プリロード待機列
        this.maxCachedPages = 25; // 最大キャッシュページ数（拡大）
        this.priorityPages = new Set(); // 優先読み込みページ
        
        // 読み込み統計
        this.stats = {
            totalLoadTime: 0,
            pagesLoaded: 0,
            cacheHits: 0,
            cacheMisses: 0
        };
        
        this.initializeProgressiveLoading();
    }
    
    initializeProgressiveLoading() {
        // ビューポート変更の監視
        this.setupViewportObserver();
        
        // メモリ使用量の監視
        this.setupMemoryMonitoring();
        
        console.log('Progressive Loader initialized');
    }
    
    // ビューポート監視の設定
    setupViewportObserver() {
        // IntersectionObserver for viewport-based loading
        if ('IntersectionObserver' in window) {
            this.viewportObserver = new IntersectionObserver(
                this.handleViewportChange.bind(this),
                { threshold: 0.1 }
            );
        }
    }
    
    // メモリ監視の設定
    setupMemoryMonitoring() {
        if ('memory' in performance) {
            setInterval(() => {
                this.checkMemoryUsage();
            }, 10000); // 10秒ごと
        }
    }
    
    // PDFの段階的読み込み開始
    async loadPDFProgressive(pdf) {
        console.log('Starting progressive PDF loading...');
        this.pdf = pdf;
        this.totalPages = pdf.numPages;
        
        // Phase 1: 重要ページの優先読み込み
        await this.loadPriorityPages();
        
        // Phase 2: 現在ページ周辺のプリロード
        this.scheduleAdjacentPreload();
        
        // Phase 3: バックグラウンドでの全ページプリロード
        this.scheduleBackgroundPreload();
        
        return true;
    }
    
    // 優先ページの読み込み（範囲拡大）
    async loadPriorityPages() {
        const currentPage = this.viewer.currentPage;
        const priorityPages = [
            1, // 表紙
            Math.min(2, this.totalPages), // 目次
            Math.min(3, this.totalPages), // 最初のコンテンツ
            currentPage, // 現在のページ
            // 現在ページの前後5ページを優先読み込み
            ...this.getPageRange(currentPage - 5, currentPage + 5)
        ];
        
        console.log('Loading priority pages:', priorityPages);
        
        for (const pageNum of priorityPages) {
            if (pageNum <= this.totalPages) {
                this.priorityPages.add(pageNum);
                await this.loadPageData(pageNum, true);
            }
        }
    }
    
    // ページデータの読み込み
    async loadPageData(pageNumber, isPriority = false) {
        if (this.loadedPages.has(pageNumber) || this.loadingQueue.has(pageNumber)) {
            this.stats.cacheHits++;
            return this.loadedPages.get(pageNumber);
        }
        
        this.stats.cacheMisses++;
        this.loadingQueue.add(pageNumber);
        
        const startTime = performance.now();
        
        try {
            console.log(`Loading page ${pageNumber} (${isPriority ? 'priority' : 'normal'})`);
            
            const page = await this.pdf.getPage(pageNumber);
            
            // ページの基本情報を事前計算
            const viewport = page.getViewport({ scale: 1.0 });
            const pageData = {
                page,
                viewport,
                scale: 1.0,
                rendered: false,
                lastAccess: Date.now(),
                priority: isPriority
            };
            
            // メモリ制限チェック
            this.enforceMemoryLimits();
            
            // キャッシュに保存
            this.loadedPages.set(pageNumber, pageData);
            
            const loadTime = performance.now() - startTime;
            this.stats.totalLoadTime += loadTime;
            this.stats.pagesLoaded++;
            
            console.log(`Page ${pageNumber} loaded in ${loadTime.toFixed(2)}ms`);
            
            return pageData;
            
        } catch (error) {
            console.error(`Failed to load page ${pageNumber}:`, error);
            throw error;
        } finally {
            this.loadingQueue.delete(pageNumber);
        }
    }
    
    // 隣接ページのプリロード（範囲拡大）
    scheduleAdjacentPreload() {
        const currentPage = this.viewer.currentPage;
        const preloadRange = 8; // 前後8ページに拡大
        
        // 隣接ページを優先度別に分けて追加
        for (let offset = 1; offset <= preloadRange; offset++) {
            const priority = offset <= 3 ? 'adjacent' : 'extended'; // 3ページ以内は高優先度
            
            // 次のページ
            const nextPage = currentPage + offset;
            if (nextPage <= this.totalPages) {
                this.addToPreloadQueue(nextPage, priority);
            }
            
            // 前のページ
            const prevPage = currentPage - offset;
            if (prevPage >= 1) {
                this.addToPreloadQueue(prevPage, priority);
            }
        }
        
        this.processPreloadQueue();
    }
    
    // バックグラウンドプリロード（より積極的に）
    scheduleBackgroundPreload() {
        // 中優先度でのバックグラウンド読み込み（より早く開始）
        setTimeout(() => {
            this.startBackgroundPreload();
        }, 1000); // 1秒後に開始（短縮）
        
        // 段階的読み込み: 近いページから優先的に
        setTimeout(() => {
            this.startExpandedPreload();
        }, 500); // さらに積極的な先読み
    }
    
    async startBackgroundPreload() {
        console.log('Starting background preload...');
        
        for (let pageNum = 1; pageNum <= this.totalPages; pageNum++) {
            if (!this.loadedPages.has(pageNum) && !this.priorityPages.has(pageNum)) {
                this.addToPreloadQueue(pageNum, 'background');
            }
        }
        
        // CPUが空いている時に実行
        this.processPreloadQueueIdle();
    }
    
    // 拡張プリロード（現在ページ周辺を重点的に）
    async startExpandedPreload() {
        console.log('Starting expanded preload...');
        const currentPage = this.viewer.currentPage;
        const expandedRange = 15; // 前後15ページ
        
        // 現在ページから近い順に読み込み
        const pagesToLoad = [];
        
        for (let offset = 1; offset <= expandedRange; offset++) {
            // 現在ページ + offset
            if (currentPage + offset <= this.totalPages) {
                pagesToLoad.push({ page: currentPage + offset, distance: offset });
            }
            // 現在ページ - offset
            if (currentPage - offset >= 1) {
                pagesToLoad.push({ page: currentPage - offset, distance: offset });
            }
        }
        
        // 距離順にソート
        pagesToLoad.sort((a, b) => a.distance - b.distance);
        
        // 未読み込みページのみキューに追加
        for (const item of pagesToLoad) {
            if (!this.loadedPages.has(item.page) && !this.priorityPages.has(item.page)) {
                this.addToPreloadQueue(item.page, 'normal');
            }
        }
        
        this.processPreloadQueueIdle();
    }
    
    // プリロードキューに追加（優先度システム強化）
    addToPreloadQueue(pageNumber, type) {
        if (!this.preloadQueue.find(item => item.page === pageNumber)) {
            // 優先度設定（数値が高いほど優先）
            let priority;
            switch (type) {
                case 'adjacent':    priority = 5; break;  // 隣接ページ（最高優先度）
                case 'extended':    priority = 4; break;  // 拡張範囲
                case 'normal':      priority = 3; break;  // 通常
                case 'background':  priority = 1; break;  // バックグラウンド（最低優先度）
                default:           priority = 2; break;  // その他
            }
            
            this.preloadQueue.push({
                page: pageNumber,
                type,
                priority,
                timestamp: Date.now()
            });
            
            // 優先度でソート（同じ優先度なら新しい順）
            this.preloadQueue.sort((a, b) => {
                if (a.priority !== b.priority) {
                    return b.priority - a.priority;
                }
                return b.timestamp - a.timestamp;
            });
        }
    }
    
    // プリロードキューの処理
    async processPreloadQueue() {
        while (this.preloadQueue.length > 0) {
            const item = this.preloadQueue.shift();
            
            try {
                await this.loadPageData(item.page);
                
                // 各読み込み間に小さな遅延を入れる
                await new Promise(resolve => setTimeout(resolve, 50));
                
            } catch (error) {
                console.warn(`Preload failed for page ${item.page}:`, error);
            }
            
            // メモリ使用量チェック
            if (this.isMemoryLimitReached()) {
                console.log('Memory limit reached, pausing preload');
                break;
            }
        }
    }
    
    // アイドル時のプリロード処理
    processPreloadQueueIdle() {
        if ('requestIdleCallback' in window) {
            const processIdle = (deadline) => {
                while (deadline.timeRemaining() > 10 && this.preloadQueue.length > 0) {
                    const item = this.preloadQueue.shift();
                    this.loadPageData(item.page).catch(error => {
                        console.warn(`Idle preload failed for page ${item.page}:`, error);
                    });
                }
                
                if (this.preloadQueue.length > 0) {
                    requestIdleCallback(processIdle);
                }
            };
            
            requestIdleCallback(processIdle);
        } else {
            // フォールバック: setTimeout使用
            setTimeout(() => this.processPreloadQueue(), 100);
        }
    }
    
    // キャッシュされたページの取得
    getCachedPage(pageNumber) {
        const pageData = this.loadedPages.get(pageNumber);
        if (pageData) {
            pageData.lastAccess = Date.now();
            return pageData;
        }
        return null;
    }
    
    // メモリ制限の強制
    enforceMemoryLimits() {
        if (this.loadedPages.size <= this.maxCachedPages) {
            return;
        }
        
        // LRU (Least Recently Used) アルゴリズムでページを削除
        const sortedPages = Array.from(this.loadedPages.entries())
            .filter(([pageNum, data]) => !this.priorityPages.has(pageNum))
            .sort(([, a], [, b]) => a.lastAccess - b.lastAccess);
        
        const pagesToRemove = sortedPages.slice(0, this.loadedPages.size - this.maxCachedPages);
        
        for (const [pageNum] of pagesToRemove) {
            this.loadedPages.delete(pageNum);
            console.log(`Removed page ${pageNum} from cache (LRU)`);
        }
    }
    
    // メモリ使用量チェック
    checkMemoryUsage() {
        if ('memory' in performance) {
            const memory = performance.memory;
            const usedMB = memory.usedJSHeapSize / 1024 / 1024;
            const limitMB = memory.jsHeapSizeLimit / 1024 / 1024;
            
            console.log(`Memory usage: ${usedMB.toFixed(1)}MB / ${limitMB.toFixed(1)}MB`);
            
            // メモリ使用量が80%を超えた場合
            if (usedMB / limitMB > 0.8) {
                this.aggressiveCleanup();
            }
        }
    }
    
    // メモリ限界チェック
    isMemoryLimitReached() {
        if ('memory' in performance) {
            const memory = performance.memory;
            return memory.usedJSHeapSize / memory.jsHeapSizeLimit > 0.7;
        }
        return this.loadedPages.size > this.maxCachedPages * 1.5;
    }
    
    // 積極的なクリーンアップ
    aggressiveCleanup() {
        console.log('Performing aggressive memory cleanup...');
        
        // 優先ページ以外をすべて削除
        const priorityData = new Map();
        for (const pageNum of this.priorityPages) {
            if (this.loadedPages.has(pageNum)) {
                priorityData.set(pageNum, this.loadedPages.get(pageNum));
            }
        }
        
        this.loadedPages.clear();
        
        for (const [pageNum, data] of priorityData) {
            this.loadedPages.set(pageNum, data);
        }
        
        // ガベージコレクションを促す
        if (window.gc) {
            window.gc();
        }
        
        console.log('Aggressive cleanup completed');
    }
    
    // ビューポート変更ハンドラ
    handleViewportChange(entries) {
        for (const entry of entries) {
            if (entry.isIntersecting) {
                // ビューポートに入ったページの優先度を上げる
                const pageNum = parseInt(entry.target.dataset.page);
                if (pageNum) {
                    this.priorityPages.add(pageNum);
                    this.scheduleAdjacentPreload();
                }
            }
        }
    }
    
    // 統計情報の取得
    getStats() {
        const avgLoadTime = this.stats.pagesLoaded > 0 
            ? this.stats.totalLoadTime / this.stats.pagesLoaded 
            : 0;
            
        return {
            ...this.stats,
            avgLoadTime: avgLoadTime.toFixed(2),
            cachedPages: this.loadedPages.size,
            cacheHitRate: this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses) * 100,
            queueSize: this.preloadQueue.length
        };
    }
    
    // キャッシュ統計取得（RealtimeDashboard用）
    getCacheStats() {
        const totalRequests = (this.stats.cacheHits || 0) + (this.stats.cacheMisses || 0);
        const hitRate = totalRequests > 0 ? ((this.stats.cacheHits || 0) / totalRequests) * 100 : 0;
        
        return {
            cachedPages: this.loadedPages.size,
            maxCacheSize: this.maxCachedPages || 10,
            cacheHits: this.stats.cacheHits || 0,
            cacheMisses: this.stats.cacheMisses || 0,
            hitRate: hitRate,
            totalRequests: totalRequests,
            memoryUsage: this.estimateMemoryUsage()
        };
    }
    
    // ページ範囲取得のヘルパーメソッド
    getPageRange(start, end) {
        const range = [];
        const validStart = Math.max(1, start);
        const validEnd = Math.min(this.totalPages, end);
        
        for (let i = validStart; i <= validEnd; i++) {
            range.push(i);
        }
        return range;
    }

    // キャッシュされたページの取得
    getCachedPage(pageNumber) {
        if (this.loadedPages.has(pageNumber)) {
            console.log(`📋 Found cached page ${pageNumber}`);
            return this.loadedPages.get(pageNumber);
        }
        console.log(`❌ Page ${pageNumber} not found in cache`);
        return null;
    }

    // メモリ使用量推定
    estimateMemoryUsage() {
        // 大まかなページあたりのメモリ使用量（KB）
        const avgPageSize = 500; // KB
        return this.loadedPages.size * avgPageSize;
    }
    
    // 品質設定の更新（AdaptiveQualityManager用）
    updateQualitySettings(qualitySettings) {
        this.qualitySettings = qualitySettings;
        
        // 品質に応じてキャッシュサイズを調整（全体的に拡大）
        switch (qualitySettings.name) {
            case 'Ultra Quality':
                this.maxCachedPages = 50; // 大幅拡大
                break;
            case 'High Quality':
                this.maxCachedPages = 35; // 高品質
                break;
            case 'Medium Quality':
                this.maxCachedPages = 25; // デフォルト（拡大済み）
                break;
            case 'Low Quality':
                this.maxCachedPages = 15; // 低品質でも十分なキャッシュ
                break;
            case 'Minimal Quality':
                this.maxCachedPages = 10; // 最小でも10ページ
                break;
        }
        
        // キャッシュサイズを超えている場合は調整
        if (this.loadedPages.size > this.maxCachedPages) {
            this.aggressiveCleanup();
        }
        
        console.log(`Progressive Loader updated for ${qualitySettings.name}: max cache = ${this.maxCachedPages}`);
    }
    
    // クリーンアップ
    cleanup() {
        if (this.viewportObserver) {
            this.viewportObserver.disconnect();
        }
        
        this.loadedPages.clear();
        this.preloadQueue = [];
        this.priorityPages.clear();
        
        console.log('Progressive Loader cleaned up');
    }
}