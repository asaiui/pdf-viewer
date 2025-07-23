/**
 * 非同期処理マネージャー - パフォーマンス最適化
 * 並列処理、プリロード、キューイング、Worker活用
 */
class AsyncManager {
    constructor(viewer) {
        this.viewer = viewer;
        
        // 並列処理制御
        this.maxConcurrent = 3; // 同時実行数制限
        this.activeRequests = 0;
        this.requestQueue = [];
        
        // プリロード管理
        this.preloadQueue = [];
        this.preloadedPages = new Set();
        this.preloadDistance = 2; // 前後2ページをプリロード
        
        // キャッシュ管理（最適化済み）
        this.imageCache = new Map();
        this.maxCacheSize = 10; // メモリ効率を重視した最適サイズ
        this.cacheAccessOrder = new Map(); // LRU実装用
        this.cacheStats = {
            hits: 0,
            misses: 0,
            evictions: 0
        };
        
        // リクエスト統計
        this.requestStats = {
            total: 0,
            success: 0,
            failed: 0,
            avgTime: 0,
            totalTime: 0
        };
        
        // Worker管理（利用可能な場合）
        this.workers = [];
        this.workerQueue = [];
        this.maxWorkers = 2;
        
        // バックグラウンドタスク
        this.backgroundTasks = new Set();
        this.idleCallback = null;
        
        // Worker処理管理
        this.pendingImageProcesses = new Map();
        this.pendingBatchProcesses = new Map();
        
        this.initialize();
    }
    
    initialize() {
        this.setupWorkers();
        this.setupIdleProcessing();
        console.log('AsyncManager initialized');
    }
    
    /**
     * Web Workersの設定（重い処理用）
     */
    setupWorkers() {
        if (typeof Worker === 'undefined') return;
        
        try {
            // 高機能Workerをインライン作成
            const workerCode = `
                // Worker内部状態
                let cacheStats = { processed: 0, errors: 0 };
                
                self.onmessage = function(e) {
                    const { type, data, id } = e.data;
                    
                    switch (type) {
                        case 'processImage':
                            // 画像の前処理とメタデータ抽出
                            processImageData(data, id);
                            break;
                            
                        case 'calculatePreload':
                            // アダプティブプリロード計算
                            calculateAdaptivePreload(data, id);
                            break;
                            
                        case 'optimizeCache':
                            // キャッシュ最適化計算
                            optimizeCacheStrategy(data, id);
                            break;
                            
                        case 'batchProcess':
                            // バッチ処理
                            processBatchOperations(data, id);
                            break;
                    }
                };
                
                function processImageData(data, id) {
                    try {
                        // 画像サイズ最適化計算
                        const { width, height, quality } = data;
                        const optimizedSize = calculateOptimalSize(width, height);
                        
                        cacheStats.processed++;
                        
                        self.postMessage({
                            type: 'imageProcessed',
                            id,
                            result: {
                                originalSize: { width, height },
                                optimizedSize,
                                compressionRatio: (width * height) / (optimizedSize.width * optimizedSize.height),
                                recommendedQuality: Math.min(quality * 1.1, 0.95)
                            },
                            timestamp: Date.now()
                        });
                    } catch (error) {
                        cacheStats.errors++;
                        self.postMessage({
                            type: 'imageProcessError',
                            id,
                            error: error.message
                        });
                    }
                }
                
                function calculateAdaptivePreload(data, id) {
                    const { currentPage, totalPages, distance, accessPattern } = data;
                    const pages = [];
                    
                    // アクセスパターンに基づくアダプティブ距離
                    let adaptiveDistance = distance;
                    if (accessPattern && accessPattern.sequentialRate > 0.8) {
                        adaptiveDistance = Math.min(distance + 1, 4);
                    } else if (accessPattern && accessPattern.randomRate > 0.6) {
                        adaptiveDistance = Math.max(distance - 1, 1);
                    }
                    
                    // 前方向（通常読み進み）を優先
                    for (let i = currentPage + 1; i <= Math.min(totalPages, currentPage + adaptiveDistance); i++) {
                        pages.push({ page: i, priority: 'high' });
                    }
                    
                    // 後方向
                    for (let i = Math.max(1, currentPage - Math.floor(adaptiveDistance/2)); i < currentPage; i++) {
                        pages.push({ page: i, priority: 'low' });
                    }
                    
                    self.postMessage({
                        type: 'preloadCalculated',
                        id,
                        result: pages,
                        adaptiveDistance
                    });
                }
                
                function optimizeCacheStrategy(data, id) {
                    const { cacheEntries, memoryPressure } = data;
                    let strategy = 'normal';
                    
                    if (memoryPressure > 0.8) {
                        strategy = 'aggressive';
                    } else if (memoryPressure < 0.4) {
                        strategy = 'generous';
                    }
                    
                    const recommendations = {
                        maxCacheSize: strategy === 'aggressive' ? 6 : strategy === 'generous' ? 15 : 10,
                        evictionThreshold: strategy === 'aggressive' ? 0.7 : 0.8,
                        preloadDistance: strategy === 'aggressive' ? 1 : strategy === 'generous' ? 3 : 2
                    };
                    
                    self.postMessage({
                        type: 'cacheOptimized',
                        id,
                        result: recommendations,
                        strategy
                    });
                }
                
                function processBatchOperations(data, id) {
                    const { operations } = data;
                    const results = [];
                    
                    operations.forEach((op, index) => {
                        try {
                            // 各操作を順次処理
                            let result;
                            switch (op.type) {
                                case 'imageSize':
                                    result = calculateOptimalSize(op.width, op.height);
                                    break;
                                case 'preloadCalc':
                                    result = calculateAdaptivePreload(op.data, \`batch-\${index}\`);
                                    break;
                            }
                            results.push({ index, success: true, result });
                        } catch (error) {
                            results.push({ index, success: false, error: error.message });
                        }
                    });
                    
                    self.postMessage({
                        type: 'batchProcessed',
                        id,
                        result: results
                    });
                }
                
                function calculateOptimalSize(width, height) {
                    const maxWidth = 1920;
                    const maxHeight = 1080;
                    
                    if (width <= maxWidth && height <= maxHeight) {
                        return { width, height };
                    }
                    
                    const ratio = Math.min(maxWidth / width, maxHeight / height);
                    return {
                        width: Math.floor(width * ratio),
                        height: Math.floor(height * ratio)
                    };
                }
            `;
            
            const blob = new Blob([workerCode], { type: 'application/javascript' });
            const workerUrl = URL.createObjectURL(blob);
            
            for (let i = 0; i < this.maxWorkers; i++) {
                const worker = new Worker(workerUrl);
                worker.onmessage = this.handleWorkerMessage.bind(this);
                worker.onerror = this.handleWorkerError.bind(this);
                this.workers.push(worker);
            }
            
            URL.revokeObjectURL(workerUrl);
            
        } catch (error) {
            console.warn('Workers not available:', error);
        }
    }
    
    /**
     * アイドル時処理の設定
     */
    setupIdleProcessing() {
        if (typeof requestIdleCallback !== 'undefined') {
            const processIdleTasks = (deadline) => {
                while (deadline.timeRemaining() > 0 && this.backgroundTasks.size > 0) {
                    const task = this.backgroundTasks.values().next().value;
                    this.backgroundTasks.delete(task);
                    
                    try {
                        task();
                    } catch (error) {
                        console.warn('Background task error:', error);
                    }
                }
                
                // 次のアイドル期間を予約
                this.idleCallback = requestIdleCallback(processIdleTasks);
            };
            
            this.idleCallback = requestIdleCallback(processIdleTasks);
        }
    }
    
    /**
     * 非同期画像読み込み（優先度付き）
     */
    async loadImageAsync(pageNumber, priority = 'normal') {
        const cacheKey = `page-${pageNumber}`;
        
        // キャッシュチェック（LRU更新付き）
        if (this.imageCache.has(cacheKey)) {
            this.cacheStats.hits++;
            // LRU: アクセス時刻を更新
            this.cacheAccessOrder.set(cacheKey, {
                accessTime: Date.now(),
                accessCount: (this.cacheAccessOrder.get(cacheKey)?.accessCount || 0) + 1
            });
            return this.imageCache.get(cacheKey);
        }
        
        this.cacheStats.misses++;
        
        // リクエスト作成
        const request = {
            id: `request_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            pageNumber,
            priority,
            startTime: performance.now(),
            promise: null
        };
        
        // 優先度に基づいてキューに追加
        if (priority === 'high') {
            this.requestQueue.unshift(request);
        } else {
            this.requestQueue.push(request);
        }
        
        // 並列実行制御
        return this.processQueue();
    }
    
    /**
     * リクエストキューの処理
     */
    async processQueue() {
        if (this.activeRequests >= this.maxConcurrent || this.requestQueue.length === 0) {
            return null;
        }
        
        const request = this.requestQueue.shift();
        this.activeRequests++;
        
        try {
            const result = await this.executeImageLoad(request);
            this.handleRequestSuccess(request, result);
            return result;
            
        } catch (error) {
            this.handleRequestError(request, error);
            throw error;
            
        } finally {
            this.activeRequests--;
            // 次のリクエストを処理
            setTimeout(() => this.processQueue(), 0);
        }
    }
    
    /**
     * 実際の画像読み込み処理
     */
    async executeImageLoad(request) {
        const { pageNumber } = request;
        const pageStr = pageNumber.toString().padStart(2, '0'); // 1ページ目 → 01
        const imageUrl = `IMG/PNG/school-guide-2026_ページ_${pageStr}.png`;
        
        // Fetch with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒タイムアウト
        
        try {
            const response = await fetch(imageUrl, {
                signal: controller.signal,
                mode: 'cors',
                cache: 'force-cache'
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const blob = await response.blob();
            const imageUrl_blob = URL.createObjectURL(blob);
            
            // 画像オブジェクト作成
            const img = new Image();
            
            return new Promise((resolve, reject) => {
                img.onload = () => {
                    // キャッシュに保存
                    this.addToCache(`page-${pageNumber}`, {
                        img,
                        url: imageUrl_blob,
                        originalUrl: imageUrl, // 元のHTTPパスを保持
                        timestamp: Date.now(),
                        size: blob.size
                    });
                    
                    resolve({
                        img,
                        url: imageUrl_blob,
                        originalUrl: imageUrl, // Worker用の元のHTTPパス
                        pageNumber,
                        size: blob.size
                    });
                };
                
                img.onerror = () => {
                    URL.revokeObjectURL(imageUrl_blob);
                    reject(new Error(`Image load failed: page ${pageNumber}`));
                };
                
                img.src = imageUrl_blob;
            });
            
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }
    
    /**
     * キャッシュに追加（改良LRU方式：アクセス頻度考慮）
     */
    addToCache(key, data) {
        // 既存エントリがある場合は削除
        if (this.imageCache.has(key)) {
            this.imageCache.delete(key);
            this.cacheAccessOrder.delete(key);
        }
        
        // キャッシュサイズ制限
        while (this.imageCache.size >= this.maxCacheSize) {
            const evictKey = this.selectEvictionTarget();
            const evictData = this.imageCache.get(evictKey);
            
            // リソース解放
            if (evictData.url) {
                URL.revokeObjectURL(evictData.url);
            }
            
            this.imageCache.delete(evictKey);
            this.cacheAccessOrder.delete(evictKey);
            this.cacheStats.evictions++;
        }
        
        this.imageCache.set(key, data);
        this.cacheAccessOrder.set(key, {
            accessTime: Date.now(),
            accessCount: 1
        });
    }
    
    /**
     * LRU削除対象選択（アクセス頻度と時刻を考慮）
     */
    selectEvictionTarget() {
        let oldestKey = null;
        let oldestScore = Infinity;
        const now = Date.now();
        
        for (const [key, access] of this.cacheAccessOrder) {
            // スコア計算：最新アクセスからの経過時間 / アクセス頻度
            const age = now - access.accessTime;
            const score = age / Math.max(access.accessCount, 1);
            
            if (score < oldestScore) {
                oldestScore = score;
                oldestKey = key;
            }
        }
        
        return oldestKey || this.imageCache.keys().next().value;
    }
    
    /**
     * インテリジェントプリロード
     */
    async startPreloading(currentPage) {
        if (this.workers.length > 0) {
            // Workerでプリロード計算
            this.postToWorker({
                type: 'calculatePreload',
                data: {
                    currentPage,
                    totalPages: this.viewer.totalPages,
                    distance: this.preloadDistance
                }
            });
        } else {
            // メインスレッドで計算
            this.calculateAndPreload(currentPage);
        }
    }
    
    /**
     * プリロード計算と実行
     */
    calculateAndPreload(currentPage) {
        const pages = [];
        
        for (let i = Math.max(1, currentPage - this.preloadDistance); 
             i <= Math.min(this.viewer.totalPages, currentPage + this.preloadDistance); 
             i++) {
            if (i !== currentPage && !this.preloadedPages.has(i)) {
                pages.push(i);
            }
        }
        
        // バックグラウンドでプリロード
        pages.forEach(pageNumber => {
            this.backgroundTasks.add(() => {
                this.loadImageAsync(pageNumber, 'low')
                    .then(() => {
                        this.preloadedPages.add(pageNumber);
                    })
                    .catch(() => {
                        // プリロード失敗は無視
                    });
            });
        });
    }
    
    /**
     * Workerメッセージ処理（拡張版）
     */
    handleWorkerMessage(event) {
        const { type, result, id, adaptiveDistance, strategy } = event.data;
        
        switch (type) {
            case 'preloadCalculated':
                // アダプティブプリロード結果
                if (adaptiveDistance && adaptiveDistance !== this.preloadDistance) {
                    this.preloadDistance = adaptiveDistance;
                    console.log(`プリロード距離を${adaptiveDistance}に調整`);
                }
                
                result.forEach(({ page, priority }) => {
                    if (!this.preloadedPages.has(page)) {
                        this.backgroundTasks.add(() => {
                            this.loadImageAsync(page, priority)
                                .then(() => {
                                    this.preloadedPages.add(page);
                                })
                                .catch(() => {
                                    // プリロード失敗は無視
                                });
                        });
                    }
                });
                break;
                
            case 'imageProcessed':
                // 画像処理完了
                if (this.pendingImageProcesses && this.pendingImageProcesses.has(id)) {
                    const resolver = this.pendingImageProcesses.get(id);
                    resolver.resolve(result);
                    this.pendingImageProcesses.delete(id);
                }
                break;
                
            case 'cacheOptimized':
                // キャッシュ戦略最適化
                if (result.maxCacheSize !== this.maxCacheSize) {
                    this.maxCacheSize = result.maxCacheSize;
                    console.log(`キャッシュサイズを${result.maxCacheSize}に調整 (戦略: ${strategy})`);
                    
                    // サイズ超過の場合はクリア
                    if (this.imageCache.size > this.maxCacheSize) {
                        this.clearCache(Math.floor(this.maxCacheSize * 0.7));
                    }
                }
                break;
                
            case 'batchProcessed':
                // バッチ処理完了
                if (this.pendingBatchProcesses && this.pendingBatchProcesses.has(id)) {
                    const resolver = this.pendingBatchProcesses.get(id);
                    resolver.resolve(result);
                    this.pendingBatchProcesses.delete(id);
                }
                break;
                
            case 'imageProcessError':
                // 画像処理エラー
                if (this.pendingImageProcesses && this.pendingImageProcesses.has(id)) {
                    const resolver = this.pendingImageProcesses.get(id);
                    resolver.reject(new Error(event.data.error));
                    this.pendingImageProcesses.delete(id);
                }
                break;
        }
    }
    
    /**
     * Workerエラー処理
     */
    handleWorkerError(error) {
        console.warn('Worker error:', error);
    }
    
    /**
     * Workerにメッセージ送信
     */
    postToWorker(message) {
        if (this.workers.length === 0) return;
        
        // 利用可能なWorkerを選択
        const worker = this.workers[Math.floor(Math.random() * this.workers.length)];
        worker.postMessage(message);
    }
    
    /**
     * 画像処理をWorkerに委託
     */
    async processImageInWorker(imageData) {
        if (this.workers.length === 0) {
            return imageData; // フォールバック
        }
        
        const id = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        return new Promise((resolve, reject) => {
            this.pendingImageProcesses.set(id, { resolve, reject });
            
            this.postToWorker({
                type: 'processImage',
                data: imageData,
                id
            });
            
            // タイムアウト設定
            setTimeout(() => {
                if (this.pendingImageProcesses.has(id)) {
                    this.pendingImageProcesses.delete(id);
                    reject(new Error('画像処理タイムアウト'));
                }
            }, 5000);
        });
    }
    
    /**
     * キャッシュ戦略最適化をWorkerに委託
     */
    async optimizeCacheInWorker() {
        if (this.workers.length === 0) return;
        
        const memoryPressure = performance.memory ? 
            performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit : 0.5;
            
        this.postToWorker({
            type: 'optimizeCache',
            data: {
                cacheEntries: this.imageCache.size,
                memoryPressure
            },
            id: `cache_${Date.now()}`
        });
    }
    
    /**
     * バッチ処理をWorkerに委託
     */
    async processBatchInWorker(operations) {
        if (this.workers.length === 0) {
            return operations; // フォールバック
        }
        
        const id = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        return new Promise((resolve, reject) => {
            this.pendingBatchProcesses.set(id, { resolve, reject });
            
            this.postToWorker({
                type: 'batchProcess',
                data: { operations },
                id
            });
            
            // タイムアウト設定
            setTimeout(() => {
                if (this.pendingBatchProcesses.has(id)) {
                    this.pendingBatchProcesses.delete(id);
                    reject(new Error('バッチ処理タイムアウト'));
                }
            }, 10000);
        });
    }
    
    /**
     * リクエスト成功処理
     */
    handleRequestSuccess(request, result) {
        const duration = performance.now() - request.startTime;
        
        this.requestStats.total++;
        this.requestStats.success++;
        this.requestStats.totalTime += duration;
        this.requestStats.avgTime = this.requestStats.totalTime / this.requestStats.total;
    }
    
    /**
     * リクエストエラー処理
     */
    handleRequestError(request, error) {
        const duration = performance.now() - request.startTime;
        
        this.requestStats.total++;
        this.requestStats.failed++;
        this.requestStats.totalTime += duration;
        this.requestStats.avgTime = this.requestStats.totalTime / this.requestStats.total;
        
        console.warn(`Image load failed for page ${request.pageNumber}:`, error);
    }
    
    /**
     * バッチ処理（複数ページを効率的に読み込み）
     */
    async loadBatch(pageNumbers, priority = 'normal') {
        const promises = pageNumbers.map(pageNumber => 
            this.loadImageAsync(pageNumber, priority)
        );
        
        // 全て完了を待つかタイムアウト
        const results = await Promise.allSettled(promises);
        
        return results.map((result, index) => ({
            pageNumber: pageNumbers[index],
            success: result.status === 'fulfilled',
            data: result.status === 'fulfilled' ? result.value : null,
            error: result.status === 'rejected' ? result.reason : null
        }));
    }
    
    /**
     * キャッシュクリア（改良メモリ管理）
     */
    clearCache(keepRecent = 3) {
        // アクセス頻度順でソート
        const sortedEntries = Array.from(this.cacheAccessOrder.entries())
            .sort((a, b) => {
                const scoreA = b[1].accessCount / Math.max(Date.now() - b[1].accessTime, 1);
                const scoreB = a[1].accessCount / Math.max(Date.now() - a[1].accessTime, 1);
                return scoreA - scoreB;
            });
        
        // 上位keepRecent個以外を削除
        sortedEntries.slice(keepRecent).forEach(([key]) => {
            const data = this.imageCache.get(key);
            if (data?.url) {
                URL.revokeObjectURL(data.url);
            }
            this.imageCache.delete(key);
            this.cacheAccessOrder.delete(key);
        });
        
        // プリロード履歴の選択的クリア
        const keepPages = new Set(sortedEntries.slice(0, keepRecent).map(([key]) => 
            parseInt(key.replace('page-', ''))
        ));
        
        this.preloadedPages.forEach(page => {
            if (!keepPages.has(page)) {
                this.preloadedPages.delete(page);
            }
        });
    }
    
    /**
     * 統計情報取得
     */
    getStats() {
        return {
            cache: {
                size: this.imageCache.size,
                maxSize: this.maxCacheSize,
                ...this.cacheStats,
                hitRate: this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses) * 100 || 0
            },
            requests: {
                ...this.requestStats,
                successRate: this.requestStats.success / this.requestStats.total * 100 || 0,
                active: this.activeRequests,
                queued: this.requestQueue.length
            },
            preload: {
                preloadedPages: this.preloadedPages.size,
                backgroundTasks: this.backgroundTasks.size
            },
            workers: {
                available: this.workers.length,
                maxWorkers: this.maxWorkers
            }
        };
    }
    
    /**
     * パフォーマンス最適化
     */
    optimize() {
        // アダプティブなプリロード距離調整
        const hitRate = this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses) || 0;
        
        if (hitRate < 0.7) {
            this.preloadDistance = Math.min(this.preloadDistance + 1, 4);
        } else if (hitRate > 0.9) {
            this.preloadDistance = Math.max(this.preloadDistance - 1, 1);
        }
        
        // メモリ使用量に基づくキャッシュサイズ調整
        if (performance.memory) {
            const memoryUsage = performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit;
            
            if (memoryUsage > 0.8) {
                this.maxCacheSize = Math.max(5, this.maxCacheSize - 2);
                this.clearCache(3);
            } else if (memoryUsage < 0.4) {
                this.maxCacheSize = Math.min(20, this.maxCacheSize + 2);
            }
        }
    }
    
    /**
     * クリーンアップ（メモリリーク防止強化）
     */
    cleanup() {
        // 全キャッシュリソースの解放
        this.imageCache.forEach(data => {
            if (data.url) {
                URL.revokeObjectURL(data.url);
            }
            // 画像オブジェクトもクリア
            if (data.img) {
                data.img.src = '';
                data.img.onload = null;
                data.img.onerror = null;
            }
        });
        this.imageCache.clear();
        this.cacheAccessOrder.clear();
        
        // リクエストキューのクリア
        this.requestQueue.forEach(request => {
            if (request.promise && typeof request.promise.cancel === 'function') {
                request.promise.cancel();
            }
        });
        this.requestQueue = [];
        
        // Workers安全終了
        this.workers.forEach(worker => {
            try {
                worker.terminate();
            } catch (e) {
                console.warn('Worker termination warning:', e);
            }
        });
        this.workers = [];
        this.workerQueue = [];
        
        // 未完了のWorker処理をクリア
        this.pendingImageProcesses.forEach(({ reject }) => {
            reject(new Error('AsyncManager cleanup'));
        });
        this.pendingImageProcesses.clear();
        
        this.pendingBatchProcesses.forEach(({ reject }) => {
            reject(new Error('AsyncManager cleanup'));
        });
        this.pendingBatchProcesses.clear();
        
        // アイドルコールバック取消
        if (this.idleCallback) {
            try {
                cancelIdleCallback(this.idleCallback);
            } catch (e) {
                console.warn('IdleCallback cancellation warning:', e);
            }
            this.idleCallback = null;
        }
        
        // バックグラウンドタスククリア
        this.backgroundTasks.clear();
        this.preloadedPages.clear();
        
        // 統計リセット
        this.cacheStats = { hits: 0, misses: 0, evictions: 0 };
        this.requestStats = { total: 0, success: 0, failed: 0, avgTime: 0, totalTime: 0 };
        
        console.log('AsyncManager cleaned up with enhanced memory leak prevention');
    }
}