/**
 * OffscreenCanvas マネージャー - Workerとの通信を管理
 * バックグラウンド描画システムの制御
 */
class OffscreenManager {
    constructor(viewer) {
        this.viewer = viewer;
        this.worker = null;
        this.isInitialized = false;
        this.pendingRequests = new Map();
        this.requestCounter = 0;
        
        // Worker サポート確認
        this.workerSupported = typeof Worker !== 'undefined';
        this.offscreenSupported = 'OffscreenCanvas' in window;
        
        // 設定
        this.maxWorkers = 1; // 通常は1つのWorkerで十分
        this.defaultCanvasSize = { width: 2048, height: 2048 };
        this.requestTimeout = 10000; // 10秒タイムアウト
        
        // 統計情報
        this.stats = {
            totalRequests: 0,
            completedRequests: 0,
            failedRequests: 0,
            averageRenderTime: 0,
            totalRenderTime: 0
        };
        
        this.initializeWorker();
    }

    /**
     * Worker の初期化
     */
    async initializeWorker() {
        if (!this.workerSupported) {
            console.warn('OffscreenManager: Worker非対応');
            return false;
        }

        if (!this.offscreenSupported) {
            console.warn('OffscreenManager: OffscreenCanvas非対応');
            return false;
        }

        try {
            console.log('OffscreenManager: Worker初期化開始');
            
            // Worker を作成
            this.worker = new Worker('./js/offscreen-worker.js');
            
            // メッセージハンドラー設定
            this.worker.addEventListener('message', this.handleWorkerMessage.bind(this));
            this.worker.addEventListener('error', this.handleWorkerError.bind(this));
            
            // Canvas の初期化
            await this.initializeCanvas(this.defaultCanvasSize);
            
            this.isInitialized = true;
            console.log('OffscreenManager: 初期化完了');
            
            return true;
            
        } catch (error) {
            console.error('OffscreenManager: 初期化失敗:', error);
            this.worker = null;
            return false;
        }
    }

    /**
     * Canvas の初期化
     */
    async initializeCanvas(canvasSize, options = {}) {
        if (!this.worker) {
            throw new Error('Worker not available');
        }

        const requestId = this.generateRequestId();
        
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.pendingRequests.delete(requestId);
                reject(new Error('Canvas初期化タイムアウト'));
            }, this.requestTimeout);
            
            this.pendingRequests.set(requestId, {
                resolve: (result) => {
                    clearTimeout(timeout);
                    resolve(result);
                },
                reject: (error) => {
                    clearTimeout(timeout);
                    reject(error);
                },
                type: 'init',
                timestamp: Date.now()
            });
            
            this.worker.postMessage({
                type: 'init',
                data: {
                    width: canvasSize.width,
                    height: canvasSize.height,
                    options: {
                        alpha: false,
                        desynchronized: true,
                        willReadFrequently: false,
                        ...options
                    }
                },
                id: requestId
            });
        });
    }

    /**
     * 画像のレンダリング（非同期）
     */
    async renderImageAsync(imageUrl, dimensions, renderOptions = {}) {
        if (!this.isInitialized || !this.worker) {
            throw new Error('OffscreenManager not initialized');
        }

        const requestId = this.generateRequestId();
        const startTime = performance.now();
        
        this.stats.totalRequests++;

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.pendingRequests.delete(requestId);
                this.stats.failedRequests++;
                reject(new Error('レンダリングタイムアウト'));
            }, this.requestTimeout);
            
            this.pendingRequests.set(requestId, {
                resolve: (result) => {
                    clearTimeout(timeout);
                    this.updateStats(performance.now() - startTime);
                    resolve(result);
                },
                reject: (error) => {
                    clearTimeout(timeout);
                    this.stats.failedRequests++;
                    reject(error);
                },
                type: 'render',
                timestamp: startTime
            });
            
            this.worker.postMessage({
                type: 'render',
                data: {
                    imageUrl: imageUrl,
                    dimensions: dimensions,
                    renderOptions: {
                        splitMode: false,
                        splitSide: 'left',
                        progressive: true,
                        quality: 'high-quality',
                        zoom: 1.0,
                        ...renderOptions
                    }
                },
                id: requestId
            });
        });
    }

    /**
     * ImageBitmap を使用した描画（fetch問題回避版）
     */
    async renderImageBitmapAsync(imageBitmap, dimensions, renderOptions = {}) {
        if (!this.isInitialized || !this.worker) {
            throw new Error('OffscreenManager not initialized');
        }

        const requestId = this.generateRequestId();
        const startTime = performance.now();
        
        this.stats.totalRequests++;

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.pendingRequests.delete(requestId);
                this.stats.failedRequests++;
                reject(new Error('レンダリングタイムアウト'));
            }, this.requestTimeout);
            
            this.pendingRequests.set(requestId, {
                resolve: (result) => {
                    clearTimeout(timeout);
                    this.updateStats(performance.now() - startTime);
                    resolve(result);
                },
                reject: (error) => {
                    clearTimeout(timeout);
                    this.stats.failedRequests++;
                    reject(error);
                },
                type: 'render',
                timestamp: startTime
            });
            
            // ImageBitmapを直接転送
            this.worker.postMessage({
                type: 'render_imagebitmap',
                data: {
                    imageBitmap: imageBitmap,
                    dimensions: dimensions,
                    renderOptions: {
                        splitMode: false,
                        splitSide: 'left',
                        progressive: true,
                        quality: 'high-quality',
                        zoom: 1.0,
                        ...renderOptions
                    }
                },
                id: requestId
            }, [imageBitmap]); // Transferable Objects
        });
    }

    /**
     * バッチレンダリング
     */
    async renderBatch(renderRequests, progressCallback = null) {
        if (!this.isInitialized || !this.worker) {
            throw new Error('OffscreenManager not initialized');
        }

        const requestId = this.generateRequestId();
        const startTime = performance.now();
        
        this.stats.totalRequests += renderRequests.length;

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.pendingRequests.delete(requestId);
                this.stats.failedRequests += renderRequests.length;
                reject(new Error('バッチレンダリングタイムアウト'));
            }, this.requestTimeout * renderRequests.length);
            
            this.pendingRequests.set(requestId, {
                resolve: (result) => {
                    clearTimeout(timeout);
                    this.updateStats(performance.now() - startTime);
                    resolve(result);
                },
                reject: (error) => {
                    clearTimeout(timeout);
                    this.stats.failedRequests += renderRequests.length;
                    reject(error);
                },
                type: 'batch_render',
                timestamp: startTime,
                progressCallback: progressCallback
            });
            
            this.worker.postMessage({
                type: 'batch_render',
                data: {
                    requests: renderRequests
                },
                id: requestId
            });
        });
    }

    /**
     * Worker メッセージハンドラー
     */
    handleWorkerMessage(event) {
        const { type, data, error, id } = event.data;
        
        const pendingRequest = this.pendingRequests.get(id);
        if (!pendingRequest) {
            console.warn('OffscreenManager: 不明なリクエストID:', id);
            return;
        }

        switch (type) {
            case 'init_complete':
                if (data?.success || type === 'init_complete') {
                    pendingRequest.resolve(true);
                } else {
                    pendingRequest.reject(new Error('初期化失敗'));
                }
                this.pendingRequests.delete(id);
                break;

            case 'render_complete':
                // dataまたはimageBitmapが含まれている場合を処理
                const result = data ? data : { imageBitmap: event.data.imageBitmap };
                pendingRequest.resolve(result);
                this.pendingRequests.delete(id);
                this.stats.completedRequests++;
                break;

            case 'render_error':
                pendingRequest.reject(new Error(error));
                this.pendingRequests.delete(id);
                break;

            case 'batch_complete':
                pendingRequest.resolve(data);
                this.pendingRequests.delete(id);
                this.stats.completedRequests += data.length;
                break;

            case 'batch_progress':
                if (pendingRequest.progressCallback) {
                    pendingRequest.progressCallback(data.progress, data.currentIndex);
                }
                break;

            case 'batch_error':
                pendingRequest.reject(new Error(error));
                this.pendingRequests.delete(id);
                break;

            case 'stats':
                // Worker統計情報の処理
                console.log('Worker Stats:', data);
                break;

            case 'error':
            case 'worker_error':
            case 'worker_unhandled_rejection':
                console.error('OffscreenManager: Workerエラー:', error);
                if (pendingRequest) {
                    pendingRequest.reject(new Error(error));
                    this.pendingRequests.delete(id);
                }
                break;

            default:
                console.warn('OffscreenManager: 未知のメッセージタイプ:', type);
        }
    }

    /**
     * Worker エラーハンドラー
     */
    handleWorkerError(error) {
        console.error('OffscreenManager: Workerエラー:', error);
        
        // 全ての待機中リクエストを失敗させる
        for (const [id, request] of this.pendingRequests) {
            request.reject(new Error('Worker error'));
        }
        this.pendingRequests.clear();
        
        // Worker を再初期化
        this.reinitializeWorker();
    }

    /**
     * Worker の再初期化
     */
    async reinitializeWorker() {
        console.log('OffscreenManager: Worker再初期化');
        
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
        
        this.isInitialized = false;
        await this.initializeWorker();
    }

    /**
     * リクエストIDの生成
     */
    generateRequestId() {
        return `req_${++this.requestCounter}_${Date.now()}`;
    }

    /**
     * 統計情報の更新
     */
    updateStats(renderTime) {
        this.stats.totalRenderTime += renderTime;
        this.stats.averageRenderTime = this.stats.totalRenderTime / this.stats.completedRequests;
    }

    /**
     * Canvas からImageBitmap への変換
     */
    async createImageBitmapFromCanvas(canvas) {
        if ('createImageBitmap' in window) {
            return await createImageBitmap(canvas);
        } else {
            // フォールバック：Canvas要素をそのまま返す
            return canvas;
        }
    }

    /**
     * ImageBitmap から Canvas への描画
     */
    drawImageBitmapToCanvas(imageBitmap, targetCanvas, targetCtx) {
        targetCtx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
        targetCtx.drawImage(imageBitmap, 0, 0);
    }

    /**
     * 統計情報の取得
     */
    getStats() {
        return {
            ...this.stats,
            isInitialized: this.isInitialized,
            workerSupported: this.workerSupported,
            offscreenSupported: this.offscreenSupported,
            pendingRequestsCount: this.pendingRequests.size,
            successRate: this.stats.totalRequests > 0 
                ? (this.stats.completedRequests / this.stats.totalRequests * 100).toFixed(2) + '%'
                : '0%'
        };
    }

    /**
     * Worker統計情報の取得
     */
    async getWorkerStats() {
        if (!this.isInitialized || !this.worker) {
            return null;
        }

        const requestId = this.generateRequestId();
        
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.pendingRequests.delete(requestId);
                reject(new Error('Worker統計取得タイムアウト'));
            }, 5000);
            
            this.pendingRequests.set(requestId, {
                resolve: (result) => {
                    clearTimeout(timeout);
                    resolve(result);
                },
                reject: (error) => {
                    clearTimeout(timeout);
                    reject(error);
                },
                type: 'get_stats'
            });
            
            this.worker.postMessage({
                type: 'get_stats',
                id: requestId
            });
        });
    }

    /**
     * サポート状況の確認
     */
    isSupported() {
        return this.workerSupported && this.offscreenSupported && this.isInitialized;
    }

    /**
     * リソースのクリーンアップ
     */
    destroy() {
        console.log('OffscreenManager: クリーンアップ開始');
        
        // 待機中のリクエストをキャンセル
        for (const [id, request] of this.pendingRequests) {
            request.reject(new Error('OffscreenManager destroyed'));
        }
        this.pendingRequests.clear();
        
        // Worker を終了
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
        
        this.isInitialized = false;
        
        console.log('OffscreenManager: クリーンアップ完了');
    }
}

// グローバル参照
window.OffscreenManager = OffscreenManager;