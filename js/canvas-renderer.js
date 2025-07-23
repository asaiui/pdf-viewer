/**
 * Canvas描画システム - 高性能レンダリングエンジン
 * WebP画像の描画を最適化し、GPU加速とメモリ効率を両立
 */
class CanvasRenderer {
    constructor(viewer) {
        this.viewer = viewer;
        this.canvas = null;
        this.ctx = null;
        this.offscreenCanvas = null;
        this.offscreenCtx = null;
        
        // レンダリング設定
        this.renderingMode = 'high-quality'; // 'high-quality' | 'performance' | 'balanced'
        this.pixelRatio = window.devicePixelRatio || 1;
        this.maxCanvasSize = this.calculateMaxCanvasSize();
        
        // パフォーマンス管理
        this.renderQueue = new Map();
        this.isRendering = false;
        this.renderStartTime = 0;
        
        // 画像データキャッシュ
        this.imageDataCache = new Map();
        this.maxCacheSize = 5; // 最大5画像をキャッシュ
        
        // OffscreenManager の統合
        this.offscreenManager = null;
        this.useOffscreenRendering = true;
        
        this.initializeCanvas();
        this.setupOffscreenCanvas();
        this.initializeOffscreenManager();
    }

    /**
     * メインCanvasの初期化
     */
    initializeCanvas() {
        // 既存のcanvas要素を検索または作成
        this.canvas = document.getElementById('renderCanvas');
        if (!this.canvas) {
            this.canvas = document.createElement('canvas');
            this.canvas.id = 'renderCanvas';
            this.canvas.style.cssText = `
                max-width: 100%;
                max-height: 100%;
                display: block;
                margin: 0 auto;
                image-rendering: high-quality;
                image-rendering: -webkit-optimize-contrast;
            `;
        }
        
        this.ctx = this.canvas.getContext('2d', {
            alpha: false, // 透明度不要で高速化
            desynchronized: true, // 非同期描画で性能向上
            colorSpace: 'srgb'
        });
        
        // 高品質描画設定
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
        
        console.log('CanvasRenderer: メインCanvas初期化完了');
    }

    /**
     * OffscreenCanvasの設定
     */
    setupOffscreenCanvas() {
        if ('OffscreenCanvas' in window) {
            this.offscreenCanvas = new OffscreenCanvas(1024, 1024);
            this.offscreenCtx = this.offscreenCanvas.getContext('2d', {
                alpha: false,
                desynchronized: true
            });
            
            this.offscreenCtx.imageSmoothingEnabled = true;
            this.offscreenCtx.imageSmoothingQuality = 'high';
            
            console.log('CanvasRenderer: OffscreenCanvas使用可能');
        } else {
            console.warn('CanvasRenderer: OffscreenCanvas非対応、フォールバック使用');
        }
    }

    /**
     * OffscreenManager の初期化
     */
    async initializeOffscreenManager() {
        if (typeof OffscreenManager !== 'undefined' && this.useOffscreenRendering) {
            try {
                this.offscreenManager = new OffscreenManager(this.viewer);
                console.log('CanvasRenderer: OffscreenManager初期化完了');
            } catch (error) {
                console.warn('CanvasRenderer: OffscreenManager初期化失敗:', error);
                this.offscreenManager = null;
            }
        } else {
            console.log('CanvasRenderer: OffscreenManager使用せず');
        }
    }

    /**
     * 最大Canvas サイズの計算
     */
    calculateMaxCanvasSize() {
        // GPUメモリ制限を考慮した最大サイズ
        const maxGPUMemory = 256 * 1024 * 1024; // 256MB想定
        const bytesPerPixel = 4; // RGBA
        const maxPixels = maxGPUMemory / bytesPerPixel;
        const maxSize = Math.sqrt(maxPixels);
        
        // 実用的な最大値を設定（4K解像度を上限とする）
        return Math.min(maxSize, 4096);
    }

    /**
     * WebP画像のCanvas描画（メイン処理）
     */
    async renderImage(imageData, options = {}) {
        const startTime = performance.now();
        this.renderStartTime = startTime;
        
        try {
            this.isRendering = true;
            
            // 描画オプションの設定
            const renderOptions = {
                zoom: options.zoom || 1.0,
                splitMode: options.splitMode || false,
                splitSide: options.splitSide || 'left',
                progressive: options.progressive || false,
                quality: options.quality || this.renderingMode,
                ...options
            };

            console.log('CanvasRenderer: 描画開始', renderOptions);

            // 画像要素の取得
            let img, imageUrl;
            if (imageData && imageData.img) {
                img = imageData.img;
                // Worker用にoriginalUrlを優先、なければurl、最後にimg.src
                imageUrl = imageData.originalUrl || imageData.url || img.src;
            } else if (imageData instanceof HTMLImageElement) {
                img = imageData;
                imageUrl = img.src;
            } else {
                throw new Error('Invalid image data');
            }
            
            // デバッグ用ログ
            console.log('CanvasRenderer: imageUrl =', imageUrl);

            // Canvas サイズの計算と設定
            const dimensions = this.calculateCanvasDimensions(img, renderOptions);
            
            // OffscreenManager を優先使用（条件が満たされる場合）
            if (this.offscreenManager && this.offscreenManager.isSupported() && this.shouldUseOffscreen(renderOptions)) {
                console.log('CanvasRenderer: OffscreenCanvas描画を使用');
                return await this.renderWithOffscreen(imageUrl, dimensions, renderOptions);
            } else {
                // フォールバック：メインスレッド描画
                console.log('CanvasRenderer: メインスレッド描画を使用');
                this.resizeCanvas(dimensions);
                return await this.renderOnMainThread(img, renderOptions, dimensions);
            }

        } catch (error) {
            console.error('CanvasRenderer: 描画エラー:', error);
            throw error;
        } finally {
            this.isRendering = false;
        }
    }

    /**
     * OffscreenCanvas使用の判定
     */
    shouldUseOffscreen(renderOptions) {
        // 高品質描画やProgressive Loadingの場合にOffscreenを使用
        return renderOptions.quality === 'high-quality' || renderOptions.progressive;
    }

    /**
     * OffscreenCanvas での描画
     */
    async renderWithOffscreen(imageUrl, dimensions, renderOptions) {
        try {
            // メインスレッドでImageBitmapを作成（Worker内でのfetch問題回避）
            let imageBitmap;
            try {
                const response = await fetch(imageUrl);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const blob = await response.blob();
                imageBitmap = await createImageBitmap(blob);
            } catch (fetchError) {
                console.warn('CanvasRenderer: fetch失敗、メインスレッド描画に切り替え', fetchError);
                throw fetchError; // フォールバックに切り替え
            }
            
            const result = await this.offscreenManager.renderImageBitmapAsync(imageBitmap, dimensions, renderOptions);
            
            // ImageBitmap を メインCanvas に描画
            this.resizeCanvas(dimensions);
            this.ctx.clearRect(0, 0, dimensions.displayWidth, dimensions.displayHeight);
            
            // resultがImageBitmapかどうか確認
            const renderedBitmap = result.imageBitmap || result;
            this.ctx.drawImage(renderedBitmap, 0, 0, dimensions.displayWidth, dimensions.displayHeight);
            
            const renderTime = performance.now() - this.renderStartTime;
            this.logPerformance('renderWithOffscreen', renderTime, dimensions);
            
            return this.canvas;
            
        } catch (error) {
            console.warn('CanvasRenderer: OffscreenCanvas描画失敗、フォールバック:', error);
            // フォールバック：メインスレッド描画
            throw error;
        }
    }

    /**
     * メインスレッドでの描画
     */
    async renderOnMainThread(img, renderOptions, dimensions) {
        this.resizeCanvas(dimensions);

        // Progressive Loading が有効な場合
        if (renderOptions.progressive) {
            await this.renderProgressive(img, renderOptions, dimensions);
        } else {
            await this.renderDirect(img, renderOptions, dimensions);
        }

        const renderTime = performance.now() - this.renderStartTime;
        this.logPerformance('renderOnMainThread', renderTime, dimensions);

        return this.canvas;
    }

    /**
     * Canvas サイズの計算
     */
    calculateCanvasDimensions(img, options) {
        const containerWidth = this.viewer.svgContainer.clientWidth || window.innerWidth;
        // ヘッダー高さ（48px）とコントロール（80px）を考慮
        const headerHeight = 48;
        const controlsHeight = 80;
        const containerHeight = this.viewer.svgContainer.clientHeight || (window.innerHeight - headerHeight - controlsHeight);
        
        // 画像の元サイズ
        const imgWidth = img.naturalWidth || img.width;
        const imgHeight = img.naturalHeight || img.height;
        
        let canvasWidth, canvasHeight;
        
        // 分割表示時は元画像の半分の比率を考慮
        if (options.splitMode) {
            // 分割表示：画像の半分のアスペクト比を使用
            const splitImgAspect = (imgWidth / 2) / imgHeight;
            const containerAspect = containerWidth / containerHeight;
            
            // スマホでの適切なズーム倍率を考慮（デフォルト230%相当）
            const isMobile = window.innerWidth <= 768;
            const baseZoom = isMobile ? 2.3 : 1.0;
            const effectiveZoom = options.zoom * baseZoom;
            
            if (splitImgAspect > containerAspect) {
                // 横長の半分画像：幅基準
                canvasWidth = Math.min(containerWidth * effectiveZoom, this.maxCanvasSize);
                canvasHeight = canvasWidth / splitImgAspect;
            } else {
                // 縦長の半分画像：高さ基準  
                canvasHeight = Math.min(containerHeight * effectiveZoom, this.maxCanvasSize);
                canvasWidth = canvasHeight * splitImgAspect;
            }
        } else {
            // 通常表示：全画像のアスペクト比を使用
            const imgAspect = imgWidth / imgHeight;
            const containerAspect = containerWidth / containerHeight;
            
            if (imgAspect > containerAspect) {
                // 横長画像: 幅基準
                canvasWidth = Math.min(containerWidth * options.zoom, this.maxCanvasSize);
                canvasHeight = canvasWidth / imgAspect;
            } else {
                // 縦長画像: 高さ基準
                canvasHeight = Math.min(containerHeight * options.zoom, this.maxCanvasSize);
                canvasWidth = canvasHeight * imgAspect;
            }
        }
        
        // Device Pixel Ratio を考慮
        const displayWidth = canvasWidth;
        const displayHeight = canvasHeight;
        canvasWidth *= this.pixelRatio;
        canvasHeight *= this.pixelRatio;
        
        return {
            canvasWidth: Math.floor(canvasWidth),
            canvasHeight: Math.floor(canvasHeight),
            displayWidth: Math.floor(displayWidth),
            displayHeight: Math.floor(displayHeight),
            imgWidth,
            imgHeight
        };
    }

    /**
     * Canvas のリサイズ
     */
    resizeCanvas(dimensions) {
        // Canvas の実際のサイズ
        this.canvas.width = dimensions.canvasWidth;
        this.canvas.height = dimensions.canvasHeight;
        
        // CSS での表示サイズ
        this.canvas.style.width = `${dimensions.displayWidth}px`;
        this.canvas.style.height = `${dimensions.displayHeight}px`;
        
        // コンテキストの設定を再適用
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
        this.ctx.scale(this.pixelRatio, this.pixelRatio);
    }

    /**
     * 直接描画（高速モード）
     */
    async renderDirect(img, options, dimensions) {
        // キャッシュから取得試行
        const cacheKey = this.generateCacheKey(img.src, options);
        const cachedData = this.imageDataCache.get(cacheKey);
        
        if (cachedData && !options.splitMode) {
            // キャッシュヒット
            this.ctx.clearRect(0, 0, dimensions.displayWidth, dimensions.displayHeight);
            this.ctx.putImageData(cachedData, 0, 0);
            console.log('CanvasRenderer: キャッシュから描画');
            return;
        }

        // 背景クリア
        this.ctx.clearRect(0, 0, dimensions.displayWidth, dimensions.displayHeight);
        
        // 分割モード処理
        if (options.splitMode) {
            await this.renderSplit(img, options, dimensions);
        } else {
            // 通常描画
            this.ctx.drawImage(
                img,
                0, 0, dimensions.imgWidth, dimensions.imgHeight,
                0, 0, dimensions.displayWidth, dimensions.displayHeight
            );
        }

        // キャッシュに保存（分割モードでない場合）
        if (!options.splitMode && this.imageDataCache.size < this.maxCacheSize) {
            try {
                const imageData = this.ctx.getImageData(0, 0, dimensions.displayWidth, dimensions.displayHeight);
                this.imageDataCache.set(cacheKey, imageData);
            } catch (error) {
                console.warn('CanvasRenderer: キャッシュ保存失敗:', error);
            }
        }
    }

    /**
     * 分割表示の描画（縦横比維持）
     */
    async renderSplit(img, options, dimensions) {
        const { imgWidth, imgHeight, displayWidth, displayHeight } = dimensions;
        
        // 元画像の半分のアスペクト比
        const splitImgAspect = (imgWidth / 2) / imgHeight;
        const canvasAspect = displayWidth / displayHeight;
        
        // 縦横比を維持した描画サイズの計算
        let drawWidth, drawHeight, offsetX, offsetY;
        
        if (splitImgAspect > canvasAspect) {
            // 横長の半分画像：幅基準でフィット
            drawWidth = displayWidth;
            drawHeight = displayWidth / splitImgAspect;
            offsetX = 0;
            offsetY = (displayHeight - drawHeight) / 2;
        } else {
            // 縦長の半分画像：高さ基準でフィット
            drawHeight = displayHeight;
            drawWidth = displayHeight * splitImgAspect;
            offsetX = (displayWidth - drawWidth) / 2;
            offsetY = 0;
        }
        
        if (options.splitSide === 'left') {
            // 左半分を縦横比を維持して描画
            this.ctx.drawImage(
                img,
                0, 0, imgWidth / 2, imgHeight, // ソース：左半分
                offsetX, offsetY, drawWidth, drawHeight // デスティネーション：縦横比維持
            );
        } else {
            // 右半分を縦横比を維持して描画
            this.ctx.drawImage(
                img,
                imgWidth / 2, 0, imgWidth / 2, imgHeight, // ソース：右半分
                offsetX, offsetY, drawWidth, drawHeight // デスティネーション：縦横比維持
            );
        }
    }

    /**
     * Progressive Loading（段階的品質向上）
     */
    async renderProgressive(img, options, dimensions) {
        const stages = [
            { quality: 0.3, smoothing: 'low' },
            { quality: 0.6, smoothing: 'medium' },
            { quality: 1.0, smoothing: 'high' }
        ];

        for (let i = 0; i < stages.length; i++) {
            const stage = stages[i];
            
            // 品質設定
            this.ctx.imageSmoothingQuality = stage.smoothing;
            
            // 段階的サイズ
            const stageWidth = dimensions.displayWidth * stage.quality;
            const stageHeight = dimensions.displayHeight * stage.quality;
            
            // 描画
            this.ctx.clearRect(0, 0, dimensions.displayWidth, dimensions.displayHeight);
            
            if (options.splitMode) {
                await this.renderSplit(img, options, {
                    ...dimensions,
                    displayWidth: stageWidth,
                    displayHeight: stageHeight
                });
            } else {
                this.ctx.drawImage(
                    img,
                    0, 0, dimensions.imgWidth, dimensions.imgHeight,
                    0, 0, stageWidth, stageHeight
                );
            }
            
            // 最終段階でない場合は少し待機
            if (i < stages.length - 1) {
                await this.sleep(16); // 約1フレーム分待機
            }
        }
        
        console.log('CanvasRenderer: Progressive Loading完了');
    }

    /**
     * OffscreenCanvas での背景処理
     */
    async renderOffscreen(img, options) {
        if (!this.offscreenCanvas) {
            return null;
        }

        return new Promise((resolve) => {
            // Worker thread での処理をシミュレート
            setTimeout(() => {
                try {
                    const dimensions = this.calculateCanvasDimensions(img, options);
                    
                    this.offscreenCanvas.width = dimensions.canvasWidth;
                    this.offscreenCanvas.height = dimensions.canvasHeight;
                    
                    this.offscreenCtx.clearRect(0, 0, dimensions.canvasWidth, dimensions.canvasHeight);
                    this.offscreenCtx.drawImage(
                        img,
                        0, 0, dimensions.imgWidth, dimensions.imgHeight,
                        0, 0, dimensions.canvasWidth, dimensions.canvasHeight
                    );
                    
                    resolve(this.offscreenCanvas.transferToImageBitmap());
                } catch (error) {
                    console.error('OffscreenCanvas描画エラー:', error);
                    resolve(null);
                }
            }, 0);
        });
    }

    /**
     * キャッシュキーの生成
     */
    generateCacheKey(src, options) {
        return `${src}_${options.zoom}_${options.quality}_${this.pixelRatio}`;
    }

    /**
     * パフォーマンスログ
     */
    logPerformance(operation, renderTime, dimensions) {
        const pixelCount = dimensions.canvasWidth * dimensions.canvasHeight;
        const pixelsPerMs = pixelCount / renderTime;
        
        console.log(`CanvasRenderer Performance [${operation}]:`, {
            renderTime: `${renderTime.toFixed(2)}ms`,
            dimensions: `${dimensions.canvasWidth}x${dimensions.canvasHeight}`,
            pixelCount: pixelCount.toLocaleString(),
            pixelsPerMs: `${pixelsPerMs.toLocaleString()} pixels/ms`,
            cacheSize: this.imageDataCache.size
        });

        // パフォーマンスモニターに通知
        if (this.viewer.performanceMonitor) {
            this.viewer.performanceMonitor.recordRenderTime(operation, renderTime);
        }
    }

    /**
     * レンダリングモードの設定
     */
    setRenderingMode(mode) {
        this.renderingMode = mode;
        
        switch (mode) {
            case 'performance':
                this.ctx.imageSmoothingQuality = 'low';
                this.maxCacheSize = 3;
                break;
            case 'balanced':
                this.ctx.imageSmoothingQuality = 'medium';
                this.maxCacheSize = 5;
                break;
            case 'high-quality':
            default:
                this.ctx.imageSmoothingQuality = 'high';
                this.maxCacheSize = 5;
                break;
        }
        
        console.log(`CanvasRenderer: レンダリングモード変更 → ${mode}`);
    }

    /**
     * キャッシュクリア
     */
    clearCache() {
        this.imageDataCache.clear();
        console.log('CanvasRenderer: キャッシュクリア完了');
    }

    /**
     * Canvas要素の取得
     */
    getCanvas() {
        return this.canvas;
    }

    /**
     * レンダリング状態の取得
     */
    getRenderingStats() {
        return {
            isRendering: this.isRendering,
            cacheSize: this.imageDataCache.size,
            maxCacheSize: this.maxCacheSize,
            renderingMode: this.renderingMode,
            pixelRatio: this.pixelRatio,
            maxCanvasSize: this.maxCanvasSize,
            offscreenSupported: !!this.offscreenCanvas
        };
    }

    /**
     * リソースのクリーンアップ
     */
    destroy() {
        // キャッシュクリア
        this.clearCache();
        
        // Canvas リセット
        if (this.canvas) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
        
        // OffscreenCanvas クリーンアップ
        if (this.offscreenCanvas) {
            this.offscreenCtx.clearRect(0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height);
        }
        
        // 参照クリア
        this.canvas = null;
        this.ctx = null;
        this.offscreenCanvas = null;
        this.offscreenCtx = null;
        
        console.log('CanvasRenderer: リソース解放完了');
    }

    /**
     * ユーティリティ: スリープ
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// グローバル参照
window.CanvasRenderer = CanvasRenderer;