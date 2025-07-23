/**
 * Progressive Loader - 段階的品質向上システム
 * 高性能な段階的読み込みとアダプティブ品質制御
 */
class ProgressiveLoader {
    constructor(viewer) {
        this.viewer = viewer;
        this.loadingStages = [];
        this.currentStage = 0;
        this.isProgressing = false;
        
        // Progressive設定
        this.config = {
            stages: [
                { name: 'thumbnail', scale: 0.25, quality: 'low', priority: 'high' },
                { name: 'preview', scale: 0.5, quality: 'medium', priority: 'normal' },
                { name: 'standard', scale: 0.75, quality: 'medium', priority: 'normal' },
                { name: 'full', scale: 1.0, quality: 'high', priority: 'low' }
            ],
            adaptiveQuality: true,
            networkAware: true,
            deviceAware: true
        };
        
        // パフォーマンス監視
        this.performanceData = {
            stageLoadTimes: [],
            networkSpeed: 'unknown',
            deviceCapability: 'unknown'
        };
        
        // アダプティブ調整
        this.adaptiveSettings = {
            lowEndDevice: false,
            slowNetwork: false,
            batteryLow: false
        };
        
        this.initializeAdaptiveSettings();
    }

    /**
     * アダプティブ設定の初期化
     */
    async initializeAdaptiveSettings() {
        // デバイス性能の検出
        this.detectDeviceCapability();
        
        // ネットワーク状況の検出
        this.detectNetworkConditions();
        
        // バッテリー状況の検出
        await this.detectBatteryStatus();
        
        // 設定に基づく調整
        this.adjustProgressiveStages();
        
        console.log('ProgressiveLoader: アダプティブ設定完了', this.adaptiveSettings);
    }

    /**
     * デバイス性能の検出
     */
    detectDeviceCapability() {
        const navigatorMemory = navigator.deviceMemory || 4; // GB
        const navigatorCores = navigator.hardwareConcurrency || 4;
        const isLowEnd = navigatorMemory < 3 || navigatorCores < 4;
        
        this.adaptiveSettings.lowEndDevice = isLowEnd;
        this.performanceData.deviceCapability = isLowEnd ? 'low' : 'high';
        
        console.log('ProgressiveLoader: デバイス性能', {
            memory: navigatorMemory + 'GB',
            cores: navigatorCores,
            capability: this.performanceData.deviceCapability
        });
    }

    /**
     * ネットワーク状況の検出
     */
    detectNetworkConditions() {
        if ('connection' in navigator) {
            const connection = navigator.connection;
            const effectiveType = connection.effectiveType;
            const downlink = connection.downlink; // Mbps
            
            // 低速ネットワークの判定
            const isSlowNetwork = effectiveType === 'slow-2g' || 
                                  effectiveType === '2g' || 
                                  downlink < 1.5;
            
            this.adaptiveSettings.slowNetwork = isSlowNetwork;
            this.performanceData.networkSpeed = effectiveType;
            
            console.log('ProgressiveLoader: ネットワーク状況', {
                effectiveType: effectiveType,
                downlink: downlink + 'Mbps',
                slowNetwork: isSlowNetwork
            });
        }
    }

    /**
     * バッテリー状況の検出
     */
    async detectBatteryStatus() {
        if ('getBattery' in navigator) {
            try {
                const battery = await navigator.getBattery();
                const isLowBattery = !battery.charging && battery.level < 0.2;
                
                this.adaptiveSettings.batteryLow = isLowBattery;
                
                console.log('ProgressiveLoader: バッテリー状況', {
                    level: Math.round(battery.level * 100) + '%',
                    charging: battery.charging,
                    lowBattery: isLowBattery
                });
            } catch (error) {
                console.warn('ProgressiveLoader: バッテリー情報取得失敗:', error);
            }
        }
    }

    /**
     * Progressive段階の調整
     */
    adjustProgressiveStages() {
        const originalStages = [...this.config.stages];
        
        // 低性能デバイスまたは低速ネットワークの場合
        if (this.adaptiveSettings.lowEndDevice || this.adaptiveSettings.slowNetwork) {
            // 段階数を削減
            this.config.stages = [
                originalStages[0], // thumbnail
                originalStages[2], // standard
                originalStages[3]  // full
            ];
            
            // 品質を下げる
            this.config.stages.forEach(stage => {
                if (stage.quality === 'high') stage.quality = 'medium';
            });
        }
        
        // バッテリー残量が少ない場合
        if (this.adaptiveSettings.batteryLow) {
            // 最終段階を省略
            this.config.stages = this.config.stages.slice(0, -1);
        }
        
        console.log('ProgressiveLoader: 調整後の段階', this.config.stages);
    }

    /**
     * Progressive Loading の開始
     */
    async startProgressiveLoading(imageData, renderOptions = {}) {
        if (this.isProgressing) {
            console.warn('ProgressiveLoader: 既に進行中');
            return;
        }
        
        this.isProgressing = true;
        this.currentStage = 0;
        this.loadingStages = [];
        
        const startTime = performance.now();
        
        try {
            console.log('ProgressiveLoader: Progressive Loading 開始');
            
            // 各段階で描画
            for (let i = 0; i < this.config.stages.length; i++) {
                const stage = this.config.stages[i];
                const stageStartTime = performance.now();
                
                await this.loadStage(imageData, stage, renderOptions, i);
                
                const stageTime = performance.now() - stageStartTime;
                this.performanceData.stageLoadTimes[i] = stageTime;
                
                // 進捗通知
                this.notifyProgress(i, this.config.stages.length, stage.name);
                
                // アダプティブ中断判定
                if (this.shouldSkipRemainingStages(i, stageTime)) {
                    console.log('ProgressiveLoader: 残りの段階をスキップ');
                    break;
                }
                
                // 段階間の待機（UX向上）
                if (i < this.config.stages.length - 1) {
                    await this.waitBetweenStages(stage, stageTime);
                }
            }
            
            const totalTime = performance.now() - startTime;
            console.log(`ProgressiveLoader: Progressive Loading完了 ${totalTime.toFixed(2)}ms`);
            
            // 完了通知
            this.notifyComplete(totalTime);
            
        } catch (error) {
            console.error('ProgressiveLoader: Progressive Loading失敗:', error);
            throw error;
        } finally {
            this.isProgressing = false;
        }
    }

    /**
     * 段階的読み込みの実行
     */
    async loadStage(imageData, stage, renderOptions, stageIndex) {
        console.log(`ProgressiveLoader: Stage ${stageIndex + 1} (${stage.name}) 開始`);
        
        const stageOptions = {
            ...renderOptions,
            progressive: false, // 各段階は非Progressive
            quality: stage.quality,
            scale: stage.scale,
            stageName: stage.name,
            stageIndex: stageIndex
        };
        
        // CanvasRendererまたはWebPViewerに描画を依頼
        if (this.viewer.svgViewer && this.viewer.svgViewer.canvasRenderer) {
            await this.renderWithCanvas(imageData, stageOptions);
        } else {
            await this.renderWithFallback(imageData, stageOptions);
        }
        
        this.loadingStages.push({
            stage: stage.name,
            completed: true,
            timestamp: Date.now()
        });
    }

    /**
     * Canvas描画での段階実行
     */
    async renderWithCanvas(imageData, stageOptions) {
        const canvasRenderer = this.viewer.svgViewer.canvasRenderer;
        
        // 段階固有の寸法計算
        const originalDimensions = canvasRenderer.calculateCanvasDimensions(
            imageData.img || imageData, 
            { zoom: 1.0 }
        );
        
        const stageDimensions = {
            ...originalDimensions,
            canvasWidth: Math.floor(originalDimensions.canvasWidth * stageOptions.scale),
            canvasHeight: Math.floor(originalDimensions.canvasHeight * stageOptions.scale),
            displayWidth: Math.floor(originalDimensions.displayWidth * stageOptions.scale),
            displayHeight: Math.floor(originalDimensions.displayHeight * stageOptions.scale)
        };
        
        // 段階的描画
        await canvasRenderer.renderImage(imageData, {
            ...stageOptions,
            forceDimensions: stageDimensions
        });
    }

    /**
     * フォールバック描画での段階実行
     */
    async renderWithFallback(imageData, stageOptions) {
        // CSS transformを使った段階的表示
        const img = imageData.img || imageData;
        if (img && img.style) {
            const scale = stageOptions.scale;
            img.style.transform = `scale(${scale})`;
            img.style.filter = this.getQualityFilter(stageOptions.quality);
            img.style.transition = 'transform 0.3s ease-out, filter 0.3s ease-out';
        }
        
        // レンダリング完了まで待機
        await this.waitForRender();
    }

    /**
     * 品質フィルターの取得
     */
    getQualityFilter(quality) {
        switch (quality) {
            case 'low':
                return 'blur(1px) contrast(0.8)';
            case 'medium':
                return 'contrast(0.9)';
            case 'high':
            default:
                return 'none';
        }
    }

    /**
     * 残り段階のスキップ判定
     */
    shouldSkipRemainingStages(currentStageIndex, stageTime) {
        // 低速ネットワークで時間がかかりすぎる場合
        if (this.adaptiveSettings.slowNetwork && stageTime > 1000) {
            return true;
        }
        
        // バッテリー残量が少ない場合
        if (this.adaptiveSettings.batteryLow && currentStageIndex >= 1) {
            return true;
        }
        
        // 低性能デバイスで負荷が高い場合
        if (this.adaptiveSettings.lowEndDevice && stageTime > 500) {
            return currentStageIndex >= Math.floor(this.config.stages.length / 2);
        }
        
        return false;
    }

    /**
     * 段階間の待機
     */
    async waitBetweenStages(stage, stageTime) {
        // アダプティブ待機時間
        let waitTime = 50; // 基本50ms
        
        if (this.adaptiveSettings.lowEndDevice) {
            waitTime = Math.max(100, stageTime * 0.1); // 低性能デバイスは長めに待機
        }
        
        if (this.adaptiveSettings.slowNetwork) {
            waitTime = Math.min(waitTime, 30); // 低速ネットワークは短めに
        }
        
        await this.sleep(waitTime);
    }

    /**
     * 進捗通知
     */
    notifyProgress(stageIndex, totalStages, stageName) {
        const progress = (stageIndex + 1) / totalStages;
        
        // PerformanceMonitorに通知
        if (this.viewer.performanceMonitor) {
            this.viewer.performanceMonitor.recordProgressiveStage(stageName, progress);
        }
        
        // ユーザーインターフェースに通知
        if (this.viewer.updateProgress) {
            this.viewer.updateProgress(
                Math.round(progress * 100),
                `${stageName}画質で表示中... (${stageIndex + 1}/${totalStages})`
            );
        }
        
        console.log(`ProgressiveLoader: 進捗 ${Math.round(progress * 100)}% (${stageName})`);
    }

    /**
     * 完了通知
     */
    notifyComplete(totalTime) {
        // パフォーマンス記録
        if (this.viewer.performanceMonitor) {
            this.viewer.performanceMonitor.recordProgressiveComplete(totalTime, this.loadingStages);
        }
        
        console.log('ProgressiveLoader: Progressive Loading完了', {
            totalTime: totalTime.toFixed(2) + 'ms',
            stages: this.loadingStages.length,
            stagesTimes: this.performanceData.stageLoadTimes.map(t => t.toFixed(2) + 'ms')
        });
    }

    /**
     * Progressive Loading状況の取得
     */
    getProgressStatus() {
        return {
            isProgressing: this.isProgressing,
            currentStage: this.currentStage,
            totalStages: this.config.stages.length,
            completedStages: this.loadingStages,
            adaptiveSettings: this.adaptiveSettings,
            performanceData: this.performanceData
        };
    }

    /**
     * 設定の更新
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.adjustProgressiveStages();
        console.log('ProgressiveLoader: 設定更新完了');
    }

    /**
     * Progressive Loading の中止
     */
    cancelProgressiveLoading() {
        if (this.isProgressing) {
            this.isProgressing = false;
            console.log('ProgressiveLoader: Progressive Loading中止');
        }
    }

    /**
     * ユーティリティメソッド
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    waitForRender() {
        return new Promise(resolve => requestAnimationFrame(resolve));
    }

    /**
     * リソースのクリーンアップ
     */
    destroy() {
        this.cancelProgressiveLoading();
        this.loadingStages = [];
        this.performanceData.stageLoadTimes = [];
        console.log('ProgressiveLoader: リソース解放完了');
    }
}

// グローバル参照
window.ProgressiveLoader = ProgressiveLoader;