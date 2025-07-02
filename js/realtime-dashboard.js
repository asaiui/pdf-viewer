/**
 * Realtime Performance Dashboard
 * リアルタイムパフォーマンス監視ダッシュボード
 */
class RealtimeDashboard {
    constructor(viewer) {
        this.viewer = viewer;
        this.isVisible = false;
        this.updateInterval = null;
        this.metricsHistory = {
            renderTimes: [],
            memoryUsage: [],
            networkSpeed: [],
            cacheHitRate: [],
            prefetchAccuracy: []
        };
        
        this.maxHistoryLength = 60; // 1分間のデータ保持
        this.colors = {
            primary: '#0066CC',
            secondary: '#FF6600',
            success: '#28a745',
            warning: '#ffc107',
            danger: '#dc3545',
            info: '#17a2b8'
        };
        
        this.initializeDashboard();
    }
    
    // ダッシュボード初期化
    initializeDashboard() {
        this.createDashboardUI();
        this.attachEventListeners();
        this.startMetricsCollection();
        
        console.log('📊 Realtime Performance Dashboard initialized');
    }
    
    // ダッシュボードUI作成
    createDashboardUI() {
        // メインコンテナ
        const dashboard = document.createElement('div');
        dashboard.id = 'realtimeDashboard';
        dashboard.className = 'realtime-dashboard';
        dashboard.style.cssText = this.getDashboardStyles();
        
        dashboard.innerHTML = `
            <div class="dashboard-header">
                <h3>🚀 リアルタイムパフォーマンス監視</h3>
                <div class="dashboard-controls">
                    <button class="dashboard-toggle" id="dashboardToggle">最小化</button>
                    <button class="dashboard-close" id="dashboardClose">×</button>
                </div>
            </div>
            
            <div class="dashboard-content">
                <!-- メトリクス概要 -->
                <div class="metrics-overview">
                    <div class="metric-card">
                        <div class="metric-label">レンダリング速度</div>
                        <div class="metric-value" id="renderSpeed">--ms</div>
                        <div class="metric-trend" id="renderTrend">📈</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-label">メモリ使用量</div>
                        <div class="metric-value" id="memoryUsage">--MB</div>
                        <div class="metric-trend" id="memoryTrend">📊</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-label">キャッシュヒット率</div>
                        <div class="metric-value" id="cacheHitRate">--%</div>
                        <div class="metric-trend" id="cacheTrend">💾</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-label">プリフェッチ精度</div>
                        <div class="metric-value" id="prefetchAccuracy">--%</div>
                        <div class="metric-trend" id="prefetchTrend">🎯</div>
                    </div>
                </div>
                
                <!-- リアルタイムチャート -->
                <div class="charts-container">
                    <div class="chart-section">
                        <h4>レンダリング性能</h4>
                        <canvas id="renderChart" width="300" height="120"></canvas>
                    </div>
                    <div class="chart-section">
                        <h4>メモリ使用量</h4>
                        <canvas id="memoryChart" width="300" height="120"></canvas>
                    </div>
                </div>
                
                <!-- システム情報 -->
                <div class="system-info">
                    <div class="info-section">
                        <h4>🔧 システム情報</h4>
                        <div class="info-grid">
                            <div class="info-item">
                                <span>PDF.js バージョン:</span>
                                <span id="pdfjsVersion">3.11.174</span>
                            </div>
                            <div class="info-item">
                                <span>現在のCDN:</span>
                                <span id="currentCDN">--</span>
                            </div>
                            <div class="info-item">
                                <span>WebWorker数:</span>
                                <span id="workerCount">--</span>
                            </div>
                            <div class="info-item">
                                <span>OffscreenCanvas:</span>
                                <span id="offscreenSupport">--</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="info-section">
                        <h4>🎯 パフォーマンス統計</h4>
                        <div class="info-grid">
                            <div class="info-item">
                                <span>総ページ数:</span>
                                <span id="totalPages">--</span>
                            </div>
                            <div class="info-item">
                                <span>キャッシュページ数:</span>
                                <span id="cachedPages">--</span>
                            </div>
                            <div class="info-item">
                                <span>プリフェッチ成功率:</span>
                                <span id="prefetchSuccess">--%</span>
                            </div>
                            <div class="info-item">
                                <span>平均読み込み時間:</span>
                                <span id="avgLoadTime">--ms</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- アラート -->
                <div class="alerts-container" id="alertsContainer">
                    <h4>⚠️ パフォーマンスアラート</h4>
                    <div class="alerts-list" id="alertsList">
                        <div class="alert-item info">システム監視開始</div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(dashboard);
        
        // チャート初期化
        this.initializeCharts();
    }
    
    // CSS スタイル
    getDashboardStyles() {
        return `
            position: fixed;
            top: 20px;
            right: 20px;
            width: 400px;
            max-height: 80vh;
            background: rgba(255, 255, 255, 0.95);
            border: 1px solid #ddd;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 12px;
            backdrop-filter: blur(10px);
            overflow-y: auto;
            transition: all 0.3s ease;
            display: none;
        `;
    }
    
    // イベントリスナー設定
    attachEventListeners() {
        // トグルボタン
        document.getElementById('dashboardToggle').addEventListener('click', () => {
            this.toggleMinimize();
        });
        
        // 閉じるボタン
        document.getElementById('dashboardClose').addEventListener('click', () => {
            this.hide();
        });
        
        // キーボードショートカット（Ctrl+Shift+D）
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'D') {
                e.preventDefault();
                this.toggle();
            }
        });
    }
    
    // チャート初期化
    initializeCharts() {
        // レンダリング性能チャート
        this.renderChart = this.createMiniChart('renderChart', this.colors.primary);
        
        // メモリ使用量チャート
        this.memoryChart = this.createMiniChart('memoryChart', this.colors.secondary);
    }
    
    // ミニチャート作成
    createMiniChart(canvasId, color) {
        const canvas = document.getElementById(canvasId);
        const ctx = canvas.getContext('2d');
        
        return {
            canvas,
            ctx,
            color,
            data: [],
            maxDataPoints: 60,
            
            update(newValue) {
                this.data.push(newValue);
                if (this.data.length > this.maxDataPoints) {
                    this.data.shift();
                }
                this.draw();
            },
            
            draw() {
                const { ctx, canvas, data, color } = this;
                
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                
                if (data.length < 2) return;
                
                const max = Math.max(...data) || 1;
                const min = Math.min(...data) || 0;
                const range = max - min || 1;
                
                ctx.strokeStyle = color;
                ctx.lineWidth = 2;
                ctx.beginPath();
                
                data.forEach((value, index) => {
                    const x = (index / (this.maxDataPoints - 1)) * canvas.width;
                    const y = canvas.height - ((value - min) / range) * canvas.height;
                    
                    if (index === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }
                });
                
                ctx.stroke();
                
                // 現在値の点
                if (data.length > 0) {
                    const lastValue = data[data.length - 1];
                    const x = canvas.width;
                    const y = canvas.height - ((lastValue - min) / range) * canvas.height;
                    
                    ctx.fillStyle = color;
                    ctx.beginPath();
                    ctx.arc(x - 2, y, 3, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        };
    }
    
    // メトリクス収集開始
    startMetricsCollection() {
        this.updateInterval = setInterval(() => {
            this.collectMetrics();
            this.updateUI();
        }, 1000);
    }
    
    // メトリクス収集
    collectMetrics() {
        // レンダリング性能
        if (this.viewer.performanceMonitor) {
            const renderTime = this.viewer.performanceMonitor.getAverageRenderTime();
            this.addMetric('renderTimes', renderTime);
        }
        
        // メモリ使用量
        if ('memory' in performance) {
            const memory = performance.memory.usedJSHeapSize / 1024 / 1024;
            this.addMetric('memoryUsage', memory);
        }
        
        // キャッシュヒット率
        if (this.viewer.progressiveLoader) {
            const hitRate = this.viewer.progressiveLoader.getCacheStats().hitRate || 0;
            this.addMetric('cacheHitRate', hitRate);
        }
        
        // プリフェッチ精度
        if (this.viewer.intelligentPrefetch) {
            const accuracy = this.viewer.intelligentPrefetch.calculatePrefetchHitRate();
            this.addMetric('prefetchAccuracy', accuracy);
        }
    }
    
    // メトリクス追加
    addMetric(type, value) {
        if (!this.metricsHistory[type]) {
            this.metricsHistory[type] = [];
        }
        
        this.metricsHistory[type].push(value);
        
        if (this.metricsHistory[type].length > this.maxHistoryLength) {
            this.metricsHistory[type].shift();
        }
    }
    
    // UI更新
    updateUI() {
        this.updateMetricCards();
        this.updateCharts();
        this.updateSystemInfo();
        this.checkPerformanceAlerts();
    }
    
    // メトリクスカード更新
    updateMetricCards() {
        // レンダリング速度
        const latestRender = this.getLatestMetric('renderTimes');
        if (latestRender !== null) {
            document.getElementById('renderSpeed').textContent = `${latestRender.toFixed(1)}ms`;
            document.getElementById('renderTrend').textContent = this.getTrendIcon('renderTimes');
        }
        
        // メモリ使用量
        const latestMemory = this.getLatestMetric('memoryUsage');
        if (latestMemory !== null) {
            document.getElementById('memoryUsage').textContent = `${latestMemory.toFixed(1)}MB`;
            document.getElementById('memoryTrend').textContent = this.getTrendIcon('memoryUsage');
        }
        
        // キャッシュヒット率
        const latestCache = this.getLatestMetric('cacheHitRate');
        if (latestCache !== null) {
            document.getElementById('cacheHitRate').textContent = `${latestCache.toFixed(1)}%`;
            document.getElementById('cacheTrend').textContent = this.getTrendIcon('cacheHitRate');
        }
        
        // プリフェッチ精度
        const latestPrefetch = this.getLatestMetric('prefetchAccuracy');
        if (latestPrefetch !== null) {
            document.getElementById('prefetchAccuracy').textContent = `${latestPrefetch.toFixed(1)}%`;
            document.getElementById('prefetchTrend').textContent = this.getTrendIcon('prefetchAccuracy');
        }
    }
    
    // チャート更新
    updateCharts() {
        const latestRender = this.getLatestMetric('renderTimes');
        if (latestRender !== null) {
            this.renderChart.update(latestRender);
        }
        
        const latestMemory = this.getLatestMetric('memoryUsage');
        if (latestMemory !== null) {
            this.memoryChart.update(latestMemory);
        }
    }
    
    // システム情報更新
    updateSystemInfo() {
        // 現在のCDN
        if (this.viewer.cdnManager) {
            const currentCDN = this.viewer.cdnManager.currentCDN?.name || 'Unknown';
            document.getElementById('currentCDN').textContent = currentCDN;
        }
        
        // WebWorker数
        if (this.viewer.parallelRenderer) {
            const workerCount = this.viewer.parallelRenderer.workers?.length || 0;
            document.getElementById('workerCount').textContent = workerCount;
        }
        
        // OffscreenCanvas対応
        const offscreenSupport = 'OffscreenCanvas' in window ? '✅' : '❌';
        document.getElementById('offscreenSupport').textContent = offscreenSupport;
        
        // 統計情報
        document.getElementById('totalPages').textContent = this.viewer.totalPages || '--';
        
        if (this.viewer.progressiveLoader) {
            const stats = this.viewer.progressiveLoader.getCacheStats();
            document.getElementById('cachedPages').textContent = stats.cachedPages || 0;
        }
    }
    
    // パフォーマンスアラートチェック
    checkPerformanceAlerts() {
        const alerts = [];
        
        // レンダリング時間が500ms以上
        const renderTime = this.getLatestMetric('renderTimes');
        if (renderTime && renderTime > 500) {
            alerts.push({
                type: 'warning',
                message: `レンダリング時間が遅い: ${renderTime.toFixed(1)}ms`
            });
        }
        
        // メモリ使用量が100MB以上
        const memory = this.getLatestMetric('memoryUsage');
        if (memory && memory > 100) {
            alerts.push({
                type: 'danger',
                message: `メモリ使用量が高い: ${memory.toFixed(1)}MB`
            });
        }
        
        // キャッシュヒット率が50%以下
        const cacheHit = this.getLatestMetric('cacheHitRate');
        if (cacheHit !== null && cacheHit < 50) {
            alerts.push({
                type: 'warning',
                message: `キャッシュ効率が低い: ${cacheHit.toFixed(1)}%`
            });
        }
        
        this.updateAlerts(alerts);
    }
    
    // アラート更新
    updateAlerts(alerts) {
        const container = document.getElementById('alertsList');
        
        // 新しいアラートのみ追加
        alerts.forEach(alert => {
            if (!this.hasAlert(alert.message)) {
                const alertElement = document.createElement('div');
                alertElement.className = `alert-item ${alert.type}`;
                alertElement.textContent = alert.message;
                alertElement.style.cssText = `
                    padding: 4px 8px;
                    margin: 2px 0;
                    border-radius: 4px;
                    background: ${this.getAlertColor(alert.type)};
                    color: white;
                    font-size: 11px;
                `;
                
                container.appendChild(alertElement);
            }
        });
        
        // 古いアラートを削除（最新10個のみ保持）
        while (container.children.length > 10) {
            container.removeChild(container.firstChild);
        }
    }
    
    // アラート存在チェック
    hasAlert(message) {
        const alerts = document.querySelectorAll('#alertsList .alert-item');
        return Array.from(alerts).some(alert => alert.textContent === message);
    }
    
    // アラート色取得
    getAlertColor(type) {
        const colors = {
            info: this.colors.info,
            warning: this.colors.warning,
            danger: this.colors.danger,
            success: this.colors.success
        };
        return colors[type] || this.colors.info;
    }
    
    // 最新メトリクス取得
    getLatestMetric(type) {
        const metrics = this.metricsHistory[type];
        return metrics && metrics.length > 0 ? metrics[metrics.length - 1] : null;
    }
    
    // トレンドアイコン取得
    getTrendIcon(type) {
        const metrics = this.metricsHistory[type];
        if (!metrics || metrics.length < 5) return '📊';
        
        const recent = metrics.slice(-5);
        const trend = recent[recent.length - 1] - recent[0];
        
        if (type === 'memoryUsage' || type === 'renderTimes') {
            // 少ない方が良い指標
            return trend > 0 ? '📈' : '📉';
        } else {
            // 多い方が良い指標
            return trend > 0 ? '📈' : '📉';
        }
    }
    
    // ダッシュボード表示/非表示
    show() {
        const dashboard = document.getElementById('realtimeDashboard');
        dashboard.style.display = 'block';
        this.isVisible = true;
        
        setTimeout(() => {
            dashboard.style.opacity = '1';
            dashboard.style.transform = 'translateY(0)';
        }, 10);
    }
    
    hide() {
        const dashboard = document.getElementById('realtimeDashboard');
        dashboard.style.opacity = '0';
        dashboard.style.transform = 'translateY(-20px)';
        
        setTimeout(() => {
            dashboard.style.display = 'none';
            this.isVisible = false;
        }, 300);
    }
    
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }
    
    // 最小化トグル
    toggleMinimize() {
        const content = document.querySelector('.dashboard-content');
        const toggle = document.getElementById('dashboardToggle');
        
        if (content.style.display === 'none') {
            content.style.display = 'block';
            toggle.textContent = '最小化';
        } else {
            content.style.display = 'none';
            toggle.textContent = '展開';
        }
    }
    
    // クリーンアップ
    cleanup() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        
        const dashboard = document.getElementById('realtimeDashboard');
        if (dashboard) {
            dashboard.remove();
        }
        
        console.log('Realtime Dashboard cleaned up');
    }
}