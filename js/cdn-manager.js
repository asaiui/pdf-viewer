/**
 * CDN Manager
 * 高度なCDNフォールバック戦略と自動切り替え
 */
class CDNManager {
    constructor() {
        this.cdnSources = {
            pdfjs: [
                {
                    name: 'cloudflare',
                    baseUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174',
                    files: {
                        pdf: '/pdf.min.js',
                        worker: '/pdf.worker.min.js',
                        cmaps: '/cmaps/',
                        fonts: '/standard_fonts/'
                    },
                    priority: 1,
                    region: 'global',
                    speed: null,
                    reliability: 1.0
                },
                {
                    name: 'jsdelivr',
                    baseUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build',
                    files: {
                        pdf: '/pdf.min.js',
                        worker: '/pdf.worker.min.js',
                        cmaps: '/cmaps/',
                        fonts: '/standard_fonts/'
                    },
                    priority: 2,
                    region: 'global',
                    speed: null,
                    reliability: 1.0
                },
                {
                    name: 'unpkg',
                    baseUrl: 'https://unpkg.com/pdfjs-dist@3.11.174/build',
                    files: {
                        pdf: '/pdf.min.js',
                        worker: '/pdf.worker.min.js',
                        cmaps: '/cmaps/',
                        fonts: '/standard_fonts/'
                    },
                    priority: 3,
                    region: 'global',
                    speed: null,
                    reliability: 1.0
                }
            ]
        };
        
        this.currentCDN = null;
        this.healthCheckInterval = null;
        this.speedTestResults = new Map();
        this.failureHistory = new Map();
        this.lastOptimization = 0;
        
        this.stats = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            cdnSwitches: 0,
            avgResponseTime: 0
        };
        
        this.initializeCDNManager();
    }
    
    // CDN マネージャーの初期化
    async initializeCDNManager() {
        
        // 初期CDN選択
        await this.selectOptimalCDN();
        
        // 定期的なヘルスチェック
        this.startHealthChecks();
        
        // ネットワーク状態監視
        this.setupNetworkMonitoring();
        
    }
    
    // 最適CDNの選択
    async selectOptimalCDN() {
        
        const cdnPerformance = await this.performSpeedTests();
        
        // パフォーマンス、信頼性、地域を考慮してCDNを選択
        const sortedCDNs = this.cdnSources.pdfjs
            .map(cdn => ({
                ...cdn,
                score: this.calculateCDNScore(cdn, cdnPerformance.get(cdn.name))
            }))
            .sort((a, b) => b.score - a.score);
        
        this.currentCDN = sortedCDNs[0];
        
        
        return this.currentCDN;
    }
    
    // CDNスピードテスト
    async performSpeedTests() {
        
        const results = new Map();
        const testPromises = this.cdnSources.pdfjs.map(cdn => 
            this.testCDNSpeed(cdn)
        );
        
        const testResults = await Promise.allSettled(testPromises);
        
        testResults.forEach((result, index) => {
            const cdn = this.cdnSources.pdfjs[index];
            if (result.status === 'fulfilled') {
                results.set(cdn.name, result.value);
                this.speedTestResults.set(cdn.name, result.value);
            } else {
                results.set(cdn.name, { speed: Infinity, success: false });
            }
        });
        
        return results;
    }
    
    // 個別CDNスピードテスト
    async testCDNSpeed(cdn) {
        const testUrl = cdn.baseUrl + cdn.files.pdf;
        const startTime = performance.now();
        
        try {
            const response = await fetch(testUrl, { 
                method: 'HEAD',
                mode: 'cors',
                cache: 'no-cache'
            });
            
            const endTime = performance.now();
            const speed = endTime - startTime;
            
            const success = response.ok;
            
            return {
                speed,
                success,
                status: response.status,
                headers: Object.fromEntries(response.headers.entries())
            };
            
        } catch (error) {
            return {
                speed: Infinity,
                success: false,
                error: error.message
            };
        }
    }
    
    // CDNスコア計算
    calculateCDNScore(cdn, performance) {
        if (!performance || !performance.success) {
            return 0;
        }
        
        // 基本スコア（速度ベース）
        const speedScore = Math.max(0, 1000 - performance.speed) / 10;
        
        // 信頼性スコア
        const reliabilityScore = cdn.reliability * 50;
        
        // 優先度スコア（逆順）
        const priorityScore = (4 - cdn.priority) * 20;
        
        // 失敗履歴ペナルティ
        const failures = this.failureHistory.get(cdn.name) || 0;
        const penaltyScore = Math.max(0, 20 - failures * 5);
        
        return speedScore + reliabilityScore + priorityScore + penaltyScore;
    }
    
    // リソースURLの取得
    getResourceUrl(type) {
        if (!this.currentCDN) {
            return this.getFallbackUrl(type);
        }
        
        const file = this.currentCDN.files[type];
        if (!file) {
            return null;
        }
        
        return this.currentCDN.baseUrl + file;
    }
    
    // フォールバックURL
    getFallbackUrl(type) {
        const fallbackUrls = {
            pdf: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
            worker: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
            cmaps: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
            fonts: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/standard_fonts/'
        };
        
        return fallbackUrls[type];
    }
    
    // 信頼性の高いリソース取得
    async fetchWithFallback(type, options = {}) {
        this.stats.totalRequests++;
        
        let lastError = null;
        
        // 現在のCDNを試行
        if (this.currentCDN) {
            try {
                const url = this.getResourceUrl(type);
                const response = await this.fetchWithTimeout(url, options);
                
                if (response.ok) {
                    this.stats.successfulRequests++;
                    this.updateCDNReliability(this.currentCDN.name, true);
                    return response;
                }
            } catch (error) {
                lastError = error;
                this.handleCDNFailure(this.currentCDN.name, error);
            }
        }
        
        // フォールバック CDNs を順次試行
        const fallbackCDNs = this.cdnSources.pdfjs
            .filter(cdn => cdn.name !== this.currentCDN?.name)
            .sort((a, b) => a.priority - b.priority);
        
        for (const cdn of fallbackCDNs) {
            try {
                const url = cdn.baseUrl + cdn.files[type];
                const response = await this.fetchWithTimeout(url, options);
                
                if (response.ok) {
                    this.stats.successfulRequests++;
                    this.updateCDNReliability(cdn.name, true);
                    
                    // 成功したCDNに切り替え
                    await this.switchToCDN(cdn);
                    
                    return response;
                }
            } catch (error) {
                lastError = error;
                this.handleCDNFailure(cdn.name, error);
            }
        }
        
        // 全てのCDNが失敗
        this.stats.failedRequests++;
        throw new Error(`All CDNs failed. Last error: ${lastError?.message}`);
    }
    
    // タイムアウト付きfetch
    async fetchWithTimeout(url, options = {}) {
        const timeout = options.timeout || 10000; // 10秒
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            return response;
            
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }
    
    // CDN切り替え
    async switchToCDN(newCDN) {
        if (this.currentCDN?.name === newCDN.name) {
            return;
        }
        
        
        this.currentCDN = newCDN;
        this.stats.cdnSwitches++;
        
        // PDF.js Worker URLの更新
        if (typeof pdfjsLib !== 'undefined') {
            pdfjsLib.GlobalWorkerOptions.workerSrc = this.getResourceUrl('worker');
        }
        
        // イベント通知
        this.dispatchCDNChangeEvent(newCDN);
    }
    
    // CDN障害処理
    handleCDNFailure(cdnName, error) {
        
        // 失敗履歴を更新
        const failures = this.failureHistory.get(cdnName) || 0;
        this.failureHistory.set(cdnName, failures + 1);
        
        // 信頼性を下げる
        this.updateCDNReliability(cdnName, false);
        
        // 連続失敗が多い場合は自動最適化
        if (failures >= 3) {
            this.autoOptimizeCDN();
        }
    }
    
    // CDN信頼性更新
    updateCDNReliability(cdnName, success) {
        const cdn = this.cdnSources.pdfjs.find(c => c.name === cdnName);
        if (!cdn) return;
        
        if (success) {
            cdn.reliability = Math.min(1.0, cdn.reliability + 0.1);
        } else {
            cdn.reliability = Math.max(0.1, cdn.reliability - 0.2);
        }
    }
    
    // 自動CDN最適化
    async autoOptimizeCDN() {
        const now = Date.now();
        
        // 最適化の頻度制限（5分に1回）
        if (now - this.lastOptimization < 5 * 60 * 1000) {
            return;
        }
        
        this.lastOptimization = now;
        
        
        await this.selectOptimalCDN();
    }
    
    // ヘルスチェック開始
    startHealthChecks() {
        // 10分ごとにヘルスチェック
        this.healthCheckInterval = setInterval(() => {
            this.performHealthCheck();
        }, 10 * 60 * 1000);
        
    }
    
    // ヘルスチェック実行
    async performHealthCheck() {
        if (!this.currentCDN) return;
        
        try {
            const health = await this.testCDNSpeed(this.currentCDN);
            
            if (!health.success) {
                await this.autoOptimizeCDN();
            } else {
            }
            
        } catch (error) {
        }
    }
    
    // ネットワーク監視設定
    setupNetworkMonitoring() {
        if ('connection' in navigator) {
            navigator.connection.addEventListener('change', () => {
                this.handleNetworkChange();
            });
        }
        
        // オンライン/オフライン監視
        window.addEventListener('online', () => {
            this.autoOptimizeCDN();
        });
        
        window.addEventListener('offline', () => {
        });
    }
    
    // ネットワーク変更処理
    handleNetworkChange() {
        const connection = navigator.connection;
        
        // 低速ネットワークの場合は最適化
        if (connection.downlink < 1.0) {
            this.autoOptimizeCDN();
        }
    }
    
    // CDN変更イベント発行
    dispatchCDNChangeEvent(newCDN) {
        const event = new CustomEvent('cdnchange', {
            detail: { 
                newCDN: newCDN.name,
                previousCDN: this.currentCDN?.name
            }
        });
        
        window.dispatchEvent(event);
    }
    
    // 統計情報取得
    getStats() {
        const successRate = this.stats.totalRequests > 0 
            ? (this.stats.successfulRequests / this.stats.totalRequests) * 100 
            : 0;
            
        return {
            ...this.stats,
            successRate,
            currentCDN: this.currentCDN?.name,
            cdnReliability: this.cdnSources.pdfjs.map(cdn => ({
                name: cdn.name,
                reliability: cdn.reliability,
                failures: this.failureHistory.get(cdn.name) || 0,
                speed: this.speedTestResults.get(cdn.name)?.speed
            }))
        };
    }
    
    // クリーンアップ
    cleanup() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }
        
    }
}