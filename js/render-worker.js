/**
 * PDF Rendering Web Worker
 * PDF レンダリング専用WebWorker（並列処理）
 */

// PDF.js Worker の設定
self.importScripts('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js');

class PDFRenderWorker {
    constructor() {
        this.loadedPages = new Map();
        this.activeRenderTasks = new Map();
        this.workerStats = {
            renderedPages: 0,
            totalRenderTime: 0,
            cacheHits: 0
        };
        
        console.log('PDF Render Worker initialized');
    }
    
    // ページレンダリングの実行
    async renderPage(data) {
        const { pageNumber, scale, canvasData, viewport, requestId } = data;
        
        try {
            const startTime = performance.now();
            
            // キャッシュから確認
            const cacheKey = `${pageNumber}_${scale}`;
            if (this.loadedPages.has(cacheKey)) {
                this.workerStats.cacheHits++;
                const cachedData = this.loadedPages.get(cacheKey);
                
                self.postMessage({
                    type: 'renderComplete',
                    requestId,
                    pageNumber,
                    imageData: cachedData.imageData,
                    renderTime: performance.now() - startTime,
                    fromCache: true
                });
                return;
            }
            
            // 新しくレンダリング
            const imageData = await this.performRendering(pageNumber, scale, viewport);
            
            // キャッシュに保存（最大30ページに拡大）
            if (this.loadedPages.size >= 30) {
                const firstKey = this.loadedPages.keys().next().value;
                this.loadedPages.delete(firstKey);
            }
            
            this.loadedPages.set(cacheKey, {
                imageData,
                timestamp: Date.now()
            });
            
            const renderTime = performance.now() - startTime;
            this.workerStats.renderedPages++;
            this.workerStats.totalRenderTime += renderTime;
            
            self.postMessage({
                type: 'renderComplete',
                requestId,
                pageNumber,
                imageData,
                renderTime,
                fromCache: false
            });
            
        } catch (error) {
            self.postMessage({
                type: 'renderError',
                requestId,
                pageNumber,
                error: error.message
            });
        }
    }
    
    // 実際のレンダリング処理
    async performRendering(pageNumber, scale, viewport) {
        // OffscreenCanvas を使用
        const canvas = new OffscreenCanvas(viewport.width * scale, viewport.height * scale);
        const context = canvas.getContext('2d');
        
        // PDF.jsでのレンダリング（省略版）
        // 実際の実装ではPDF.jsのAPIを使用
        
        // デモ用の疑似レンダリング
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        context.fillStyle = '#333333';
        context.font = `${24 * scale}px Arial`;
        context.textAlign = 'center';
        context.fillText(
            `Page ${pageNumber}`,
            canvas.width / 2,
            canvas.height / 2
        );
        
        context.fillStyle = '#666666';
        context.font = `${16 * scale}px Arial`;
        context.fillText(
            `Rendered in WebWorker`,
            canvas.width / 2,
            canvas.height / 2 + 40 * scale
        );
        
        context.fillText(
            `Scale: ${scale.toFixed(2)}`,
            canvas.width / 2,
            canvas.height / 2 + 70 * scale
        );
        
        // ImageData として返す
        return context.getImageData(0, 0, canvas.width, canvas.height);
    }
    
    // バッチレンダリング（複数ページ同時処理）
    async batchRender(pages) {
        const results = [];
        
        for (const pageData of pages) {
            try {
                await this.renderPage(pageData);
            } catch (error) {
                console.error(`Batch render error for page ${pageData.pageNumber}:`, error);
            }
        }
        
        self.postMessage({
            type: 'batchRenderComplete',
            processedPages: pages.length
        });
    }
    
    // キャッシュクリーンアップ
    cleanupCache() {
        const now = Date.now();
        const maxAge = 5 * 60 * 1000; // 5分
        
        for (const [key, data] of this.loadedPages.entries()) {
            if (now - data.timestamp > maxAge) {
                this.loadedPages.delete(key);
            }
        }
        
        self.postMessage({
            type: 'cacheCleanup',
            remainingPages: this.loadedPages.size
        });
    }
    
    // 品質設定の更新
    updateQualitySettings(qualitySettings) {
        this.qualitySettings = qualitySettings;
        
        // 品質に応じてキャッシュサイズを調整
        switch (qualitySettings.name) {
            case 'Ultra Quality':
                this.maxCacheSize = 30;
                break;
            case 'High Quality':
                this.maxCacheSize = 25;
                break;
            case 'Medium Quality':
                this.maxCacheSize = 20;
                break;
            case 'Low Quality':
                this.maxCacheSize = 15;
                break;
            case 'Minimal Quality':
                this.maxCacheSize = 10;
                break;
            default:
                this.maxCacheSize = 20;
        }
        
        // キャッシュサイズを超えている場合は調整
        if (this.loadedPages.size > this.maxCacheSize) {
            this.cleanupCache();
        }
        
        console.log(`Worker quality updated: ${qualitySettings.name} (cache: ${this.maxCacheSize})`);
    }

    // 統計情報の取得
    getStats() {
        const avgRenderTime = this.workerStats.renderedPages > 0 
            ? this.workerStats.totalRenderTime / this.workerStats.renderedPages 
            : 0;
            
        return {
            ...this.workerStats,
            avgRenderTime,
            cachedPages: this.loadedPages.size,
            cacheHitRate: this.workerStats.cacheHits / (this.workerStats.renderedPages + this.workerStats.cacheHits) * 100,
            qualitySettings: this.qualitySettings?.name || 'Unknown'
        };
    }
}

// Worker インスタンス
const renderWorker = new PDFRenderWorker();

// メッセージハンドラ
self.addEventListener('message', async (event) => {
    const { type, data } = event.data;
    
    switch (type) {
        case 'renderPage':
            await renderWorker.renderPage(data);
            break;
            
        case 'batchRender':
            await renderWorker.batchRender(data.pages);
            break;
            
        case 'cleanupCache':
            renderWorker.cleanupCache();
            break;
            
        case 'updateQuality':
            renderWorker.updateQualitySettings(data);
            self.postMessage({
                type: 'qualityUpdated',
                data: { qualityName: data.name }
            });
            break;
            
        case 'getStats':
            self.postMessage({
                type: 'stats',
                data: renderWorker.getStats()
            });
            break;
            
        case 'clearCache':
            renderWorker.loadedPages.clear();
            self.postMessage({
                type: 'cacheCleared'
            });
            break;
            
        default:
            console.warn('Unknown message type:', type);
    }
});