/**
 * Adaptive Quality Manager
 * ネットワーク状況に応じた動的品質調整システム
 */
class AdaptiveQualityManager {
    constructor(viewer) {
        this.viewer = viewer;
        this.networkMonitor = new NetworkMonitor();
        this.qualityLevels = {
            ultra: {
                name: 'Ultra Quality',
                scale: 2.0,
                renderPriority: 'high',
                textLayerMode: 2,
                enableWebGL: true,
                compressionLevel: 0
            },
            high: {
                name: 'High Quality',
                scale: 1.5,
                renderPriority: 'high',
                textLayerMode: 1,
                enableWebGL: true,
                compressionLevel: 1
            },
            medium: {
                name: 'Medium Quality',
                scale: 1.0,
                renderPriority: 'normal',
                textLayerMode: 1,
                enableWebGL: true,
                compressionLevel: 2
            },
            low: {
                name: 'Low Quality',
                scale: 0.8,
                renderPriority: 'normal',
                textLayerMode: 0,
                enableWebGL: false,
                compressionLevel: 3
            },
            minimal: {
                name: 'Minimal Quality',
                scale: 0.5,
                renderPriority: 'low',
                textLayerMode: 0,
                enableWebGL: false,
                compressionLevel: 4
            }
        };
        
        this.currentQuality = 'medium';
        this.autoAdjustment = true;
        this.performanceThresholds = {
            renderTime: {
                excellent: 100,  // ms
                good: 300,
                poor: 800,
                critical: 2000
            },
            networkSpeed: {
                excellent: 10,   // Mbps
                good: 2,
                poor: 0.5,
                critical: 0.1
            },
            memoryUsage: {
                excellent: 50,   // MB
                good: 100,
                poor: 200,
                critical: 400
            }
        };
        
        this.adjustmentHistory = [];
        this.lastAdjustment = 0;
        this.adjustmentCooldown = 10000; // 10秒
        
        this.initializeAdaptiveQuality();
    }
    
    // 適応品質システム初期化
    initializeAdaptiveQuality() {
        
        // 初期品質設定
        this.detectOptimalQuality();
        
        // ネットワーク監視開始
        this.networkMonitor.startMonitoring();
        
        // パフォーマンス監視開始
        this.startPerformanceMonitoring();
        
        // UIコントロール作成
        this.createQualityUI();
        
    }
    
    // 最適品質自動検出
    async detectOptimalQuality() {
        
        const deviceCapabilities = this.analyzeDeviceCapabilities();
        const networkCapabilities = await this.networkMonitor.getNetworkCapabilities();
        
        // デバイス性能スコア計算
        const deviceScore = this.calculateDeviceScore(deviceCapabilities);
        
        // ネットワークスコア計算
        const networkScore = this.calculateNetworkScore(networkCapabilities);
        
        // 総合スコアに基づく品質決定
        const totalScore = (deviceScore + networkScore) / 2;
        
        if (totalScore >= 80) {
            this.currentQuality = 'ultra';
        } else if (totalScore >= 60) {
            this.currentQuality = 'high';
        } else if (totalScore >= 40) {
            this.currentQuality = 'medium';
        } else if (totalScore >= 20) {
            this.currentQuality = 'low';
        } else {
            this.currentQuality = 'minimal';
        }
        
        this.applyQualitySettings();
    }
    
    // デバイス能力分析
    analyzeDeviceCapabilities() {
        const capabilities = {
            cores: navigator.hardwareConcurrency || 2,
            memory: navigator.deviceMemory || 4,
            pixelRatio: window.devicePixelRatio || 1,
            webglSupport: this.detectWebGLSupport(),
            offscreenSupport: 'OffscreenCanvas' in window,
            serviceWorkerSupport: 'serviceWorker' in navigator
        };
        
        return capabilities;
    }
    
    // WebGL サポート検出
    detectWebGLSupport() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            return !!gl;
        } catch (e) {
            return false;
        }
    }
    
    // デバイススコア計算
    calculateDeviceScore(capabilities) {
        let score = 0;
        
        // CPU コア数 (0-25点)
        score += Math.min(25, capabilities.cores * 6.25);
        
        // メモリ (0-25点)
        score += Math.min(25, capabilities.memory * 3.125);
        
        // ピクセル比 (0-15点)
        score += Math.min(15, capabilities.pixelRatio * 7.5);
        
        // WebGL サポート (0-20点)
        if (capabilities.webglSupport) score += 20;
        
        // OffscreenCanvas サポート (0-10点)
        if (capabilities.offscreenSupport) score += 10;
        
        // ServiceWorker サポート (0-5点)
        if (capabilities.serviceWorkerSupport) score += 5;
        
        return Math.min(100, score);
    }
    
    // ネットワークスコア計算
    calculateNetworkScore(networkCapabilities) {
        let score = 0;
        
        // 接続速度 (0-50点)
        const speed = networkCapabilities.downlink || 1;
        score += Math.min(50, speed * 5);
        
        // 接続タイプ (0-30点)
        const connectionTypes = {
            '4g': 30,
            '3g': 15,
            '2g': 5,
            'slow-2g': 0,
            'wifi': 30,
            'ethernet': 30
        };
        score += connectionTypes[networkCapabilities.effectiveType] || 15;
        
        // RTT (Round Trip Time) (0-20点)
        const rtt = networkCapabilities.rtt || 300;
        score += Math.max(0, 20 - (rtt / 15));
        
        return Math.min(100, score);
    }
    
    // パフォーマンス監視開始
    startPerformanceMonitoring() {
        setInterval(() => {
            if (this.autoAdjustment) {
                this.checkPerformanceAndAdjust();
            }
        }, 5000); // 5秒ごと
    }
    
    // パフォーマンスチェックと調整
    async checkPerformanceAndAdjust() {
        const now = Date.now();
        
        // 調整クールダウンチェック
        if (now - this.lastAdjustment < this.adjustmentCooldown) {
            return;
        }
        
        const metrics = await this.gatherPerformanceMetrics();
        const recommendation = this.analyzePerformanceAndRecommend(metrics);
        
        if (recommendation && recommendation !== this.currentQuality) {
            this.adjustQuality(recommendation, 'auto');
        }
    }
    
    // パフォーマンスメトリクス収集
    async gatherPerformanceMetrics() {
        const metrics = {
            renderTime: 0,
            memoryUsage: 0,
            networkSpeed: 0,
            cacheHitRate: 0
        };
        
        // レンダリング時間
        if (this.viewer.performanceMonitor) {
            metrics.renderTime = this.viewer.performanceMonitor.getAverageRenderTime() || 0;
        }
        
        // メモリ使用量
        if ('memory' in performance) {
            metrics.memoryUsage = performance.memory.usedJSHeapSize / 1024 / 1024;
        }
        
        // ネットワーク速度
        const networkInfo = this.networkMonitor.getCurrentNetworkInfo();
        metrics.networkSpeed = networkInfo.downlink || 1;
        
        // キャッシュヒット率
        if (this.viewer.progressiveLoader) {
            metrics.cacheHitRate = this.viewer.progressiveLoader.getCacheStats().hitRate || 0;
        }
        
        return metrics;
    }
    
    // パフォーマンス分析と推奨品質計算
    analyzePerformanceAndRecommend(metrics) {
        const { renderTime, memoryUsage, networkSpeed } = metrics;
        const thresholds = this.performanceThresholds;
        
        let qualityScore = 50; // 中間値から開始
        
        // レンダリング性能評価
        if (renderTime <= thresholds.renderTime.excellent) {
            qualityScore += 20;
        } else if (renderTime <= thresholds.renderTime.good) {
            qualityScore += 10;
        } else if (renderTime <= thresholds.renderTime.poor) {
            qualityScore -= 10;
        } else {
            qualityScore -= 30;
        }
        
        // メモリ使用量評価
        if (memoryUsage <= thresholds.memoryUsage.excellent) {
            qualityScore += 15;
        } else if (memoryUsage <= thresholds.memoryUsage.good) {
            qualityScore += 5;
        } else if (memoryUsage <= thresholds.memoryUsage.poor) {
            qualityScore -= 10;
        } else {
            qualityScore -= 25;
        }
        
        // ネットワーク速度評価
        if (networkSpeed >= thresholds.networkSpeed.excellent) {
            qualityScore += 15;
        } else if (networkSpeed >= thresholds.networkSpeed.good) {
            qualityScore += 5;
        } else if (networkSpeed >= thresholds.networkSpeed.poor) {
            qualityScore -= 10;
        } else {
            qualityScore -= 20;
        }
        
        // スコアに基づく品質推奨
        if (qualityScore >= 80) return 'ultra';
        if (qualityScore >= 60) return 'high';
        if (qualityScore >= 40) return 'medium';
        if (qualityScore >= 20) return 'low';
        return 'minimal';
    }
    
    // 品質調整
    adjustQuality(newQuality, reason = 'manual') {
        if (!this.qualityLevels[newQuality]) {
            return;
        }
        
        const oldQuality = this.currentQuality;
        this.currentQuality = newQuality;
        this.lastAdjustment = Date.now();
        
        // 調整履歴記録
        this.adjustmentHistory.push({
            timestamp: Date.now(),
            from: oldQuality,
            to: newQuality,
            reason
        });
        
        // 履歴サイズ制限
        if (this.adjustmentHistory.length > 20) {
            this.adjustmentHistory.shift();
        }
        
        // 設定適用
        this.applyQualitySettings();
        
        // UI更新
        this.updateQualityUI();
        
        // イベント発行
        this.dispatchQualityChangeEvent(oldQuality, newQuality, reason);
        
    }
    
    // 品質設定適用
    applyQualitySettings() {
        const settings = this.qualityLevels[this.currentQuality];
        
        try {
            // PDF.js レンダリング設定更新
            if (this.viewer.pdfLoader) {
                this.viewer.pdfLoader.renderQuality = settings;
            }
            
            // 並列レンダリング設定更新
            if (this.viewer.parallelRenderer && typeof this.viewer.parallelRenderer.updateQualitySettings === 'function') {
                this.viewer.parallelRenderer.updateQualitySettings(settings);
            }
            
            // プログレッシブローダー設定更新
            if (this.viewer.progressiveLoader && typeof this.viewer.progressiveLoader.updateQualitySettings === 'function') {
                this.viewer.progressiveLoader.updateQualitySettings(settings);
            }
            
            
        } catch (error) {
            // Error applying quality settings
        }
    }
    
    // 品質UI作成
    createQualityUI() {
        const controlsContainer = document.getElementById('controls');
        if (!controlsContainer) return;
        
        const qualityControl = document.createElement('div');
        qualityControl.className = 'quality-controls';
        qualityControl.innerHTML = `
            <div class="quality-selector">
                <label for="qualitySelect">品質:</label>
                <select id="qualitySelect">
                    <option value="minimal">最小</option>
                    <option value="low">低</option>
                    <option value="medium">中</option>
                    <option value="high">高</option>
                    <option value="ultra">最高</option>
                </select>
                <button id="autoQualityToggle" class="auto-quality-btn">自動</button>
            </div>
        `;
        
        qualityControl.style.cssText = `
            display: inline-flex;
            align-items: center;
            gap: 8px;
            margin-left: 10px;
            padding: 4px 8px;
            background: rgba(0, 102, 204, 0.1);
            border-radius: 4px;
            font-size: 12px;
        `;
        
        controlsContainer.appendChild(qualityControl);
        
        // イベントリスナー
        document.getElementById('qualitySelect').addEventListener('change', (e) => {
            this.adjustQuality(e.target.value, 'manual');
        });
        
        document.getElementById('autoQualityToggle').addEventListener('click', () => {
            this.toggleAutoAdjustment();
        });
        
        this.updateQualityUI();
    }
    
    // 品質UI更新
    updateQualityUI() {
        const select = document.getElementById('qualitySelect');
        const autoBtn = document.getElementById('autoQualityToggle');
        
        if (select) {
            select.value = this.currentQuality;
        }
        
        if (autoBtn) {
            autoBtn.textContent = this.autoAdjustment ? '自動✓' : '手動';
            autoBtn.style.background = this.autoAdjustment ? '#28a745' : '#6c757d';
        }
    }
    
    // 自動調整トグル
    toggleAutoAdjustment() {
        this.autoAdjustment = !this.autoAdjustment;
        this.updateQualityUI();
        
        
        if (this.autoAdjustment) {
            // 自動調整有効化時は即座にチェック
            setTimeout(() => this.checkPerformanceAndAdjust(), 1000);
        }
    }
    
    // 品質変更イベント発行
    dispatchQualityChangeEvent(oldQuality, newQuality, reason) {
        const event = new CustomEvent('qualitychange', {
            detail: {
                oldQuality,
                newQuality,
                reason,
                settings: this.qualityLevels[newQuality]
            }
        });
        
        window.dispatchEvent(event);
    }
    
    // 統計情報取得
    getStats() {
        return {
            currentQuality: this.currentQuality,
            autoAdjustment: this.autoAdjustment,
            adjustmentHistory: this.adjustmentHistory.slice(-10),
            qualityLevels: Object.keys(this.qualityLevels),
            lastAdjustment: this.lastAdjustment,
            networkInfo: this.networkMonitor.getCurrentNetworkInfo()
        };
    }
    
    // クリーンアップ
    cleanup() {
        this.networkMonitor.cleanup();
        
        const qualityControls = document.querySelector('.quality-controls');
        if (qualityControls) {
            qualityControls.remove();
        }
        
    }
}

/**
 * Network Monitor
 * ネットワーク状況監視クラス
 */
class NetworkMonitor {
    constructor() {
        this.currentInfo = {
            downlink: 10,
            effectiveType: '4g',
            rtt: 50,
            saveData: false
        };
        
        this.monitoringInterval = null;
        this.speedTestHistory = [];
    }
    
    // 監視開始
    startMonitoring() {
        // Network Information API
        if ('connection' in navigator) {
            this.updateNetworkInfo();
            navigator.connection.addEventListener('change', () => {
                this.updateNetworkInfo();
            });
        }
        
        // 定期的なスピードテスト
        this.monitoringInterval = setInterval(() => {
            this.performSpeedTest();
        }, 60000); // 1分ごと
        
    }
    
    // ネットワーク情報更新
    updateNetworkInfo() {
        if ('connection' in navigator) {
            const conn = navigator.connection;
            this.currentInfo = {
                downlink: conn.downlink || this.currentInfo.downlink,
                effectiveType: conn.effectiveType || this.currentInfo.effectiveType,
                rtt: conn.rtt || this.currentInfo.rtt,
                saveData: conn.saveData || false
            };
            
        }
    }
    
    // スピードテスト実行
    async performSpeedTest() {
        try {
            const testUrl = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
            const startTime = performance.now();
            
            const response = await fetch(testUrl, { 
                method: 'HEAD',
                cache: 'no-cache'
            });
            
            const endTime = performance.now();
            const latency = endTime - startTime;
            
            this.speedTestHistory.push({
                timestamp: Date.now(),
                latency,
                success: response.ok
            });
            
            // 履歴サイズ制限
            if (this.speedTestHistory.length > 10) {
                this.speedTestHistory.shift();
            }
            
        } catch (error) {
            // Network speed test failed
        }
    }
    
    // ネットワーク能力取得
    async getNetworkCapabilities() {
        return {
            ...this.currentInfo,
            averageLatency: this.getAverageLatency()
        };
    }
    
    // 平均レイテンシ計算
    getAverageLatency() {
        if (this.speedTestHistory.length === 0) return 100;
        
        const validTests = this.speedTestHistory.filter(test => test.success);
        if (validTests.length === 0) return 100;
        
        const totalLatency = validTests.reduce((sum, test) => sum + test.latency, 0);
        return totalLatency / validTests.length;
    }
    
    // 現在のネットワーク情報取得
    getCurrentNetworkInfo() {
        return this.currentInfo;
    }
    
    // クリーンアップ
    cleanup() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }
    }
}