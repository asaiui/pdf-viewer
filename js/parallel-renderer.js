/**
 * Parallel Renderer Manager
 * 複数WebWorkerによる並列レンダリング管理
 */
class ParallelRenderer {
    constructor(viewer) {
        this.viewer = viewer;
        this.workers = [];
        this.workerQueue = [];
        this.activeRequests = new Map();
        this.requestCounter = 0;
        
        // CPU コア数に基づいてワーカー数を決定
        this.maxWorkers = Math.min(navigator.hardwareConcurrency || 2, 4);
        this.currentWorkerIndex = 0;
        
        this.stats = {
            parallelRenders: 0,
            totalWaitTime: 0,
            workerUtilization: new Array(this.maxWorkers).fill(0)
        };
        
        this.initializeWorkers();
    }
    
    // ワーカーの初期化
    async initializeWorkers() {
        console.log(`Initializing ${this.maxWorkers} render workers...`);
        
        for (let i = 0; i < this.maxWorkers; i++) {
            try {
                const worker = new Worker('./js/render-worker.js');
                
                worker.onmessage = (event) => {
                    this.handleWorkerMessage(i, event.data);
                };
                
                worker.onerror = (error) => {
                    console.error(`Worker ${i} error:`, error);
                    this.handleWorkerError(i, error);
                };
                
                this.workers.push({
                    worker,
                    busy: false,
                    id: i,
                    processedTasks: 0,
                    totalTime: 0
                });
                
                this.workerQueue.push(i);
                
            } catch (error) {
                console.error(`Failed to create worker ${i}:`, error);
            }
        }
        
        console.log(`${this.workers.length} render workers initialized successfully`);
    }
    
    // 並列ページレンダリング
    async renderPageParallel(pageNumber, scale = 1.0, priority = 'normal') {
        return new Promise((resolve, reject) => {
            const requestId = ++this.requestCounter;
            const startTime = performance.now();
            
            const request = {
                requestId,
                pageNumber,
                scale,
                priority,
                startTime,
                resolve,
                reject
            };
            
            this.activeRequests.set(requestId, request);
            
            // 利用可能なワーカーを取得
            const workerId = this.getAvailableWorker();
            
            if (workerId !== -1) {
                this.assignTaskToWorker(workerId, request);
            } else {
                // 全ワーカーがビジー状態の場合はキューに追加
                this.queueRequest(request);
            }
        });
    }
    
    // 利用可能なワーカーを取得
    getAvailableWorker() {
        // 優先度に基づいてワーカーを選択
        const availableWorkers = this.workers
            .map((worker, index) => ({ worker, index }))
            .filter(({ worker }) => !worker.busy);
            
        if (availableWorkers.length === 0) {
            return -1;
        }
        
        // 負荷分散: 最も処理数の少ないワーカーを選択
        availableWorkers.sort((a, b) => a.worker.processedTasks - b.worker.processedTasks);
        
        return availableWorkers[0].index;
    }
    
    // ワーカーにタスクを割り当て
    assignTaskToWorker(workerId, request) {
        const worker = this.workers[workerId];
        worker.busy = true;
        worker.processedTasks++;
        
        this.stats.workerUtilization[workerId]++;
        
        // ビューポート情報の計算
        const viewport = this.calculateViewport(request.pageNumber, request.scale);
        
        worker.worker.postMessage({
            type: 'renderPage',
            data: {
                pageNumber: request.pageNumber,
                scale: request.scale,
                viewport,
                requestId: request.requestId
            }
        });
        
        console.log(`Assigned page ${request.pageNumber} to worker ${workerId}`);
    }
    
    // リクエストをキューに追加
    queueRequest(request) {
        // 優先度に基づいてソート
        const priorityOrder = { high: 3, normal: 2, low: 1 };
        
        let insertIndex = this.workerQueue.length;
        for (let i = 0; i < this.workerQueue.length; i++) {
            const queuedRequest = this.workerQueue[i];
            if (priorityOrder[request.priority] > priorityOrder[queuedRequest.priority]) {
                insertIndex = i;
                break;
            }
        }
        
        this.workerQueue.splice(insertIndex, 0, request);
        console.log(`Queued page ${request.pageNumber} (priority: ${request.priority})`);
    }
    
    // ワーカーメッセージの処理
    handleWorkerMessage(workerId, message) {
        const worker = this.workers[workerId];
        
        switch (message.type) {
            case 'renderComplete':
                this.handleRenderComplete(workerId, message);
                break;
                
            case 'renderError':
                this.handleRenderError(workerId, message);
                break;
                
            case 'stats':
                console.log(`Worker ${workerId} stats:`, message.data);
                break;
                
            default:
                console.log(`Worker ${workerId} message:`, message);
        }
    }
    
    // レンダリング完了の処理
    handleRenderComplete(workerId, message) {
        const { requestId, pageNumber, imageData, renderTime, fromCache } = message;
        const worker = this.workers[workerId];
        const request = this.activeRequests.get(requestId);
        
        if (!request) {
            console.warn(`No active request found for ID ${requestId}`);
            return;
        }
        
        // 統計更新
        const waitTime = performance.now() - request.startTime;
        this.stats.parallelRenders++;
        this.stats.totalWaitTime += waitTime;
        worker.totalTime += renderTime;
        
        // メインキャンバスに描画
        this.drawImageDataToCanvas(imageData, request.scale);
        
        // リクエスト完了
        request.resolve({
            pageNumber,
            renderTime,
            waitTime,
            fromCache,
            workerId
        });
        
        // クリーンアップ
        this.activeRequests.delete(requestId);
        worker.busy = false;
        
        // キューから次のタスクを処理
        this.processNextInQueue(workerId);
        
        console.log(`✅ Page ${pageNumber} rendered by worker ${workerId} in ${renderTime.toFixed(2)}ms (${fromCache ? 'cached' : 'fresh'})`);
    }
    
    // レンダリングエラーの処理
    handleRenderError(workerId, message) {
        const { requestId, pageNumber, error } = message;
        const worker = this.workers[workerId];
        const request = this.activeRequests.get(requestId);
        
        if (request) {
            request.reject(new Error(`Worker ${workerId} render error: ${error}`));
            this.activeRequests.delete(requestId);
        }
        
        worker.busy = false;
        this.processNextInQueue(workerId);
        
        console.error(`❌ Worker ${workerId} failed to render page ${pageNumber}:`, error);
    }
    
    // キューの次のタスクを処理
    processNextInQueue(workerId) {
        if (this.workerQueue.length > 0) {
            const nextRequest = this.workerQueue.shift();
            this.assignTaskToWorker(workerId, nextRequest);
        }
    }
    
    // ワーカーエラーの処理
    handleWorkerError(workerId, error) {
        console.error(`Worker ${workerId} encountered an error:`, error);
        
        // エラーしたワーカーを再起動
        this.restartWorker(workerId);
    }
    
    // ワーカーの再起動
    async restartWorker(workerId) {
        console.log(`Restarting worker ${workerId}...`);
        
        const oldWorker = this.workers[workerId];
        oldWorker.worker.terminate();
        
        try {
            const newWorker = new Worker('./js/render-worker.js');
            
            newWorker.onmessage = (event) => {
                this.handleWorkerMessage(workerId, event.data);
            };
            
            newWorker.onerror = (error) => {
                console.error(`Restarted worker ${workerId} error:`, error);
                this.handleWorkerError(workerId, error);
            };
            
            this.workers[workerId] = {
                worker: newWorker,
                busy: false,
                id: workerId,
                processedTasks: 0,
                totalTime: 0
            };
            
            console.log(`Worker ${workerId} restarted successfully`);
            
        } catch (error) {
            console.error(`Failed to restart worker ${workerId}:`, error);
        }
    }
    
    // ビューポート計算
    calculateViewport(pageNumber, scale) {
        // 簡易的なビューポート計算
        const container = this.viewer.pdfViewerContainer;
        const width = (container?.clientWidth || 800) * scale;
        const height = (container?.clientHeight || 1000) * scale;
        
        return { width, height };
    }
    
    // ImageDataをキャンバスに描画
    drawImageDataToCanvas(imageData, scale) {
        const canvas = this.viewer.canvas;
        const ctx = canvas.getContext('2d');
        
        // キャンバスサイズを調整
        canvas.width = imageData.width;
        canvas.height = imageData.height;
        canvas.style.width = `${imageData.width / scale}px`;
        canvas.style.height = `${imageData.height / scale}px`;
        
        // ImageDataを描画
        ctx.putImageData(imageData, 0, 0);
    }
    
    // バッチレンダリング（複数ページ同時）
    async batchRenderPages(pageNumbers, scale = 1.0) {
        const promises = pageNumbers.map(pageNumber => 
            this.renderPageParallel(pageNumber, scale, 'low')
        );
        
        try {
            const results = await Promise.allSettled(promises);
            const successful = results.filter(r => r.status === 'fulfilled').length;
            
            console.log(`Batch render completed: ${successful}/${pageNumbers.length} pages`);
            return results;
            
        } catch (error) {
            console.error('Batch render error:', error);
            throw error;
        }
    }
    
    // 統計情報の取得
    getParallelStats() {
        const avgWaitTime = this.stats.parallelRenders > 0 
            ? this.stats.totalWaitTime / this.stats.parallelRenders 
            : 0;
            
        return {
            ...this.stats,
            avgWaitTime,
            activeWorkers: this.workers.length,
            busyWorkers: this.workers.filter(w => w.busy).length,
            queueLength: this.workerQueue.length,
            activeRequests: this.activeRequests.size,
            workerStats: this.workers.map((w, i) => ({
                id: i,
                busy: w.busy,
                processedTasks: w.processedTasks,
                avgTime: w.processedTasks > 0 ? w.totalTime / w.processedTasks : 0
            }))
        };
    }
    
    // 全ワーカーのキャッシュクリア
    clearAllCaches() {
        this.workers.forEach((worker, index) => {
            worker.worker.postMessage({ type: 'clearCache' });
        });
        
        console.log('Cleared all worker caches');
    }
    
    // 品質設定の更新（AdaptiveQualityManager用）
    updateQualitySettings(qualitySettings) {
        this.qualitySettings = qualitySettings;
        
        // 全ワーカーに新しい品質設定を送信
        this.workers.forEach((worker, index) => {
            worker.worker.postMessage({
                type: 'updateQuality',
                data: qualitySettings
            });
        });
        
        console.log(`Updated quality settings for ${this.workers.length} workers:`, qualitySettings.name);
    }
    
    // レンダリング優先度の設定
    setRenderingPriority(priority) {
        this.renderingPriority = priority;
        
        // 優先度に応じてワーカー数を調整
        if (priority === 'high' && this.workers.length < this.maxWorkers) {
            this.addWorker();
        } else if (priority === 'low' && this.workers.length > 2) {
            this.removeWorker();
        }
    }
    
    // ワーカー追加
    addWorker() {
        if (this.workers.length >= this.maxWorkers) {
            return;
        }
        
        const workerId = this.workers.length;
        try {
            const newWorker = new Worker('./js/render-worker.js');
            
            newWorker.onmessage = (event) => {
                this.handleWorkerMessage(workerId, event.data);
            };
            
            newWorker.onerror = (error) => {
                console.error(`New worker ${workerId} error:`, error);
                this.handleWorkerError(workerId, error);
            };
            
            this.workers.push({
                worker: newWorker,
                busy: false,
                id: workerId,
                processedTasks: 0,
                totalTime: 0
            });
            
            console.log(`Added worker ${workerId}, total: ${this.workers.length}`);
            
        } catch (error) {
            console.error('Failed to add worker:', error);
        }
    }
    
    // ワーカー削除
    removeWorker() {
        if (this.workers.length <= 1) {
            return;
        }
        
        // 最後の非アクティブワーカーを削除
        for (let i = this.workers.length - 1; i >= 0; i--) {
            if (!this.workers[i].busy) {
                this.workers[i].worker.terminate();
                this.workers.splice(i, 1);
                console.log(`Removed worker ${i}, total: ${this.workers.length}`);
                break;
            }
        }
    }
    
    // クリーンアップ
    cleanup() {
        // 全ワーカーを終了
        this.workers.forEach(worker => {
            worker.worker.terminate();
        });
        
        this.workers = [];
        this.workerQueue = [];
        this.activeRequests.clear();
        
        console.log('Parallel Renderer cleaned up');
    }
}