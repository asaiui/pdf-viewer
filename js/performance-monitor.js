/**
 * Performance Monitor
 * レンダリングパフォーマンスとリソース使用量の監視
 */
class PerformanceMonitor {
    constructor(viewer) {
        this.viewer = viewer;
        this.metrics = {
            pageRenderTimes: [],
            memoryUsage: [],
            cacheHitRate: 0,
            totalRenderTime: 0,
            averageRenderTime: 0,
            slowestPage: { page: null, time: 0 },
            fastestPage: { page: null, time: Infinity }
        };
        
        this.isMonitoring = false;
        this.monitoringInterval = null;
        this.performanceObserver = null;
        
        this.initializeMonitoring();
    }
    
    initializeMonitoring() {
        // Performance Observer の設定
        if ('PerformanceObserver' in window) {
            this.performanceObserver = new PerformanceObserver(this.handlePerformanceEntries.bind(this));
            this.performanceObserver.observe({ entryTypes: ['measure', 'navigation', 'resource'] });
        }
        
        // 定期的なメトリクス収集
        this.startMonitoring();
        
        console.log('Performance Monitor initialized');
    }
    
    // 監視開始
    startMonitoring() {
        if (this.isMonitoring) return;
        
        this.isMonitoring = true;
        
        // 5秒ごとにメトリクス収集
        this.monitoringInterval = setInterval(() => {
            this.collectMetrics();
        }, 5000);
        
        console.log('Performance monitoring started');
    }
    
    // 監視停止
    stopMonitoring() {
        if (!this.isMonitoring) return;
        
        this.isMonitoring = false;
        
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        
        console.log('Performance monitoring stopped');
    }
    
    // ページレンダリング時間の記録
    recordPageRenderTime(pageNumber, renderTime) {
        const record = {
            page: pageNumber,
            time: renderTime,
            timestamp: Date.now()
        };
        
        this.metrics.pageRenderTimes.push(record);
        this.metrics.totalRenderTime += renderTime;
        
        // 最新100レコードのみ保持
        if (this.metrics.pageRenderTimes.length > 100) {
            const removed = this.metrics.pageRenderTimes.shift();
            this.metrics.totalRenderTime -= removed.time;
        }
        
        // 平均レンダリング時間の更新
        this.metrics.averageRenderTime = this.metrics.totalRenderTime / this.metrics.pageRenderTimes.length;
        
        // 最遅・最速ページの更新
        if (renderTime > this.metrics.slowestPage.time) {
            this.metrics.slowestPage = { page: pageNumber, time: renderTime };
        }
        if (renderTime < this.metrics.fastestPage.time) {
            this.metrics.fastestPage = { page: pageNumber, time: renderTime };
        }
        
        // パフォーマンス測定をマーク
        if ('performance' in window && 'mark' in performance) {
            performance.mark(`page-${pageNumber}-render-${renderTime.toFixed(2)}ms`);
        }
        
        console.log(`📊 Page ${pageNumber} render: ${renderTime.toFixed(2)}ms (avg: ${this.metrics.averageRenderTime.toFixed(2)}ms)`);
    }
    
    // メトリクス収集
    collectMetrics() {
        // メモリ使用量の記録
        this.recordMemoryUsage();
        
        // キャッシュヒット率の更新
        this.updateCacheHitRate();
        
        // パフォーマンス警告のチェック
        this.checkPerformanceWarnings();
    }
    
    // メモリ使用量記録
    recordMemoryUsage() {
        if ('memory' in performance) {
            const memory = performance.memory;
            const memoryRecord = {
                used: memory.usedJSHeapSize,
                total: memory.totalJSHeapSize,
                limit: memory.jsHeapSizeLimit,
                timestamp: Date.now()
            };
            
            this.metrics.memoryUsage.push(memoryRecord);
            
            // 最新50レコードのみ保持
            if (this.metrics.memoryUsage.length > 50) {
                this.metrics.memoryUsage.shift();
            }
        }
    }
    
    // キャッシュヒット率更新
    updateCacheHitRate() {
        if (this.viewer.progressiveLoader) {
            const stats = this.viewer.progressiveLoader.getStats();
            this.metrics.cacheHitRate = parseFloat(stats.cacheHitRate) || 0;
        }
    }
    
    // パフォーマンス警告チェック
    checkPerformanceWarnings() {
        const warnings = [];
        
        // レンダリング時間の警告
        if (this.metrics.averageRenderTime > 1000) {
            warnings.push({
                type: 'slow-rendering',
                message: `平均レンダリング時間が遅いです: ${this.metrics.averageRenderTime.toFixed(2)}ms`,
                severity: 'warning'
            });
        }
        
        // メモリ使用量の警告
        const latestMemory = this.metrics.memoryUsage[this.metrics.memoryUsage.length - 1];
        if (latestMemory && latestMemory.used / latestMemory.limit > 0.8) {
            warnings.push({
                type: 'high-memory',
                message: `メモリ使用量が高いです: ${((latestMemory.used / latestMemory.limit) * 100).toFixed(1)}%`,
                severity: 'error'
            });
        }
        
        // キャッシュヒット率の警告
        if (this.metrics.cacheHitRate < 70 && this.metrics.pageRenderTimes.length > 10) {
            warnings.push({
                type: 'low-cache-hit',
                message: `キャッシュヒット率が低いです: ${this.metrics.cacheHitRate.toFixed(1)}%`,
                severity: 'info'
            });
        }
        
        // 警告がある場合は通知
        if (warnings.length > 0) {
            this.handlePerformanceWarnings(warnings);
        }
    }
    
    // パフォーマンス警告の処理
    handlePerformanceWarnings(warnings) {
        warnings.forEach(warning => {
            switch (warning.severity) {
                case 'error':
                    console.error(`⚠️ ${warning.message}`);
                    break;
                case 'warning':
                    console.warn(`⚠️ ${warning.message}`);
                    break;
                case 'info':
                    console.info(`ℹ️ ${warning.message}`);
                    break;
            }
        });
        
        // 自動最適化の実行
        this.autoOptimize(warnings);
    }
    
    // 自動最適化
    autoOptimize(warnings) {
        warnings.forEach(warning => {
            switch (warning.type) {
                case 'high-memory':
                    // メモリ不足時の自動クリーンアップ
                    if (this.viewer.progressiveLoader) {
                        this.viewer.progressiveLoader.aggressiveCleanup();
                    }
                    if (this.viewer.pdfLoader) {
                        this.viewer.pdfLoader.performManualMemoryCleanup();
                    }
                    break;
                    
                case 'slow-rendering':
                    // レンダリング遅延時の最適化
                    this.optimizeRenderingPerformance();
                    break;
                    
                case 'low-cache-hit':
                    // キャッシュ効率改善
                    this.optimizeCacheStrategy();
                    break;
            }
        });
    }
    
    // レンダリングパフォーマンス最適化
    optimizeRenderingPerformance() {
        console.log('🔧 Optimizing rendering performance...');
        
        // Canvas解像度の動的調整
        if (this.viewer.canvas) {
            const currentScale = window.devicePixelRatio || 1;
            if (currentScale > 1.5) {
                // 高DPI環境で解像度を下げる
                this.viewer.canvas.style.imageRendering = 'optimizeSpeed';
                console.log('Reduced canvas resolution for better performance');
            }
        }
    }
    
    // キャッシュ戦略最適化
    optimizeCacheStrategy() {
        console.log('🔧 Optimizing cache strategy...');
        
        if (this.viewer.progressiveLoader) {
            // キャッシュサイズを増やす
            this.viewer.progressiveLoader.maxCachedPages = Math.min(
                this.viewer.progressiveLoader.maxCachedPages + 2,
                15
            );
            console.log(`Cache size increased to ${this.viewer.progressiveLoader.maxCachedPages} pages`);
        }
    }
    
    // Performance Observer エントリーの処理
    handlePerformanceEntries(list) {
        const entries = list.getEntries();
        
        entries.forEach(entry => {
            if (entry.entryType === 'measure' && entry.name.includes('page-render')) {
                // カスタム測定の処理
                console.log(`Custom measure: ${entry.name} - ${entry.duration.toFixed(2)}ms`);
            }
            
            if (entry.entryType === 'resource' && entry.name.includes('.pdf')) {
                // PDF リソース読み込み時間
                console.log(`PDF resource load: ${entry.duration.toFixed(2)}ms`);
            }
        });
    }
    
    // パフォーマンスレポートの生成
    generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            renderingPerformance: {
                totalPages: this.metrics.pageRenderTimes.length,
                averageRenderTime: this.metrics.averageRenderTime.toFixed(2),
                slowestPage: this.metrics.slowestPage,
                fastestPage: this.metrics.fastestPage.time !== Infinity ? this.metrics.fastestPage : null
            },
            memoryUsage: this.getMemoryStats(),
            cachePerformance: {
                hitRate: this.metrics.cacheHitRate.toFixed(1),
                cachedPages: this.viewer.progressiveLoader ? this.viewer.progressiveLoader.loadedPages.size : 0
            },
            recommendations: this.generateRecommendations()
        };
        
        return report;
    }
    
    // メモリ統計の取得
    getMemoryStats() {
        if (this.metrics.memoryUsage.length === 0) return null;
        
        const latest = this.metrics.memoryUsage[this.metrics.memoryUsage.length - 1];
        const peak = this.metrics.memoryUsage.reduce((max, record) => 
            record.used > max.used ? record : max
        );
        
        return {
            current: {
                used: Math.round(latest.used / 1024 / 1024),
                total: Math.round(latest.total / 1024 / 1024),
                limit: Math.round(latest.limit / 1024 / 1024),
                percentage: ((latest.used / latest.limit) * 100).toFixed(1)
            },
            peak: {
                used: Math.round(peak.used / 1024 / 1024),
                percentage: ((peak.used / peak.limit) * 100).toFixed(1)
            }
        };
    }
    
    // パフォーマンス改善の推奨事項
    generateRecommendations() {
        const recommendations = [];
        
        if (this.metrics.averageRenderTime > 500) {
            recommendations.push('レンダリング時間を改善するため、低解像度モードを検討してください');
        }
        
        if (this.metrics.cacheHitRate < 80) {
            recommendations.push('キャッシュサイズを増やすことで読み込み速度が向上する可能性があります');
        }
        
        const memoryStats = this.getMemoryStats();
        if (memoryStats && parseFloat(memoryStats.current.percentage) > 70) {
            recommendations.push('メモリ使用量が高いため、定期的なクリーンアップが推奨されます');
        }
        
        return recommendations;
    }
    
    // 統計データのエクスポート
    exportStats() {
        const stats = {
            metrics: this.metrics,
            report: this.generateReport(),
            exportTime: new Date().toISOString()
        };
        
        return JSON.stringify(stats, null, 2);
    }
    
    // 平均レンダリング時間取得
    getAverageRenderTime() {
        if (this.metrics.pageRenderTimes.length === 0) {
            return 0;
        }
        
        const recentTimes = this.metrics.pageRenderTimes.slice(-10); // 直近10回
        const total = recentTimes.reduce((sum, time) => sum + time, 0);
        return total / recentTimes.length;
    }
    
    // ページレンダリング時間記録
    recordPageRenderTime(pageNumber, renderTime) {
        this.metrics.pageRenderTimes.push(renderTime);
        
        // 履歴サイズ制限
        if (this.metrics.pageRenderTimes.length > 50) {
            this.metrics.pageRenderTimes.shift();
        }
        
        // 統計更新
        this.updateRenderTimeStats(pageNumber, renderTime);
    }
    
    // レンダリング時間統計更新
    updateRenderTimeStats(pageNumber, renderTime) {
        this.metrics.totalRenderTime += renderTime;
        this.metrics.averageRenderTime = this.getAverageRenderTime();
        
        // 最速/最遅ページ更新
        if (renderTime > this.metrics.slowestPage.time) {
            this.metrics.slowestPage = { page: pageNumber, time: renderTime };
        }
        
        if (renderTime < this.metrics.fastestPage.time) {
            this.metrics.fastestPage = { page: pageNumber, time: renderTime };
        }
    }
    
    // 統計取得
    getStats() {
        return {
            ...this.metrics,
            isMonitoring: this.isMonitoring,
            currentMemoryUsage: this.getCurrentMemoryUsage()
        };
    }

    // クリーンアップ
    cleanup() {
        this.stopMonitoring();
        
        if (this.performanceObserver) {
            this.performanceObserver.disconnect();
        }
        
        console.log('Performance Monitor cleaned up');
    }
}