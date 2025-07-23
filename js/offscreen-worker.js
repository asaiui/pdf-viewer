/**
 * OffscreenCanvas Worker - バックグラウンド描画処理
 * メインスレッドをブロックしない高性能レンダリング
 */

// Worker内で利用可能な機能確認
const hasOffscreenCanvas = 'OffscreenCanvas' in self;
const hasImageBitmap = 'createImageBitmap' in self;

console.log('OffscreenWorker: 初期化開始');
console.log('OffscreenCanvas:', hasOffscreenCanvas);
console.log('ImageBitmap:', hasImageBitmap);

// Canvas とコンテキストの管理
let offscreenCanvas = null;
let ctx = null;
let renderingQueue = [];
let isProcessing = false;

/**
 * メッセージハンドリング
 */
self.addEventListener('message', async function(e) {
    const { type, data, id } = e.data;
    
    try {
        switch (type) {
            case 'init':
                await initializeCanvas(data);
                postMessage({ type: 'init_complete', id, data: { success: true } });
                break;
                
            case 'render':
                await processRenderRequest(data, id);
                break;
                
            case 'render_imagebitmap':
                await processImageBitmapRenderRequest(data, id);
                break;
                
            case 'batch_render':
                await processBatchRender(data, id);
                break;
                
            case 'clear_queue':
                clearRenderingQueue();
                postMessage({ type: 'queue_cleared', id });
                break;
                
            case 'get_stats':
                const stats = getWorkerStats();
                postMessage({ type: 'stats', data: stats, id });
                break;
                
            default:
                console.warn('OffscreenWorker: 未知のメッセージタイプ:', type);
        }
    } catch (error) {
        console.error('OffscreenWorker: エラー:', error);
        postMessage({ 
            type: 'error', 
            error: error.message, 
            id 
        });
    }
});

/**
 * Canvas の初期化
 */
async function initializeCanvas(config) {
    if (!hasOffscreenCanvas) {
        throw new Error('OffscreenCanvas is not supported');
    }
    
    const { width, height, options } = config;
    
    offscreenCanvas = new OffscreenCanvas(width, height);
    ctx = offscreenCanvas.getContext('2d', {
        alpha: false,
        desynchronized: true,
        willReadFrequently: false,
        ...options
    });
    
    // 高品質描画設定
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    console.log(`OffscreenWorker: Canvas初期化完了 ${width}x${height}`);
}

/**
 * レンダリングリクエストの処理
 */
async function processRenderRequest(renderData, requestId) {
    if (!ctx) {
        throw new Error('Canvas not initialized');
    }
    
    const startTime = performance.now();
    
    try {
        const result = await renderImage(renderData);
        const renderTime = performance.now() - startTime;
        
        // ImageBitmapをメインスレッドに転送
        postMessage({ 
            type: 'render_complete', 
            data: result, 
            renderTime: renderTime,
            id: requestId 
        }, [result.imageBitmap]);
        
        console.log(`OffscreenWorker: レンダリング完了 ${renderTime.toFixed(2)}ms`);
        
    } catch (error) {
        console.error('OffscreenWorker: レンダリングエラー:', error);
        postMessage({ 
            type: 'render_error', 
            error: error.message, 
            id: requestId 
        });
    }
}

/**
 * ImageBitmap を使用したレンダリング処理（fetch問題回避版）
 */
async function processImageBitmapRenderRequest(data, requestId) {
    const startTime = performance.now();
    
    try {
        // ImageBitmapを直接使用してレンダリング
        const result = await renderImageBitmap(data);
        
        const renderTime = performance.now() - startTime;
        
        // 結果を返す（ImageBitmapはTransferable）
        postMessage({ 
            type: 'render_complete', 
            imageBitmap: result,
            id: requestId,
            renderTime: renderTime
        }, [result]);
        
        console.log(`OffscreenWorker: ImageBitmapレンダリング完了 ${renderTime.toFixed(2)}ms`);
        
    } catch (error) {
        console.error('OffscreenWorker: ImageBitmapレンダリングエラー:', error);
        postMessage({ 
            type: 'render_error', 
            error: error.message, 
            id: requestId 
        });
    }
}

/**
 * 画像のレンダリング処理
 */
async function renderImage(renderData) {
    const {
        imageUrl,
        dimensions,
        renderOptions
    } = renderData;
    
    // Canvas サイズの設定
    offscreenCanvas.width = dimensions.canvasWidth;
    offscreenCanvas.height = dimensions.canvasHeight;
    
    // 画像の読み込み
    const imageBitmap = await createImageBitmap(await fetch(imageUrl).then(r => r.blob()));
    
    // 背景クリア
    ctx.clearRect(0, 0, dimensions.canvasWidth, dimensions.canvasHeight);
    
    // レンダリング品質の設定
    setRenderingQuality(renderOptions.quality);
    
    // 描画処理
    if (renderOptions.progressive) {
        await renderProgressive(imageBitmap, dimensions, renderOptions);
    } else {
        await renderDirect(imageBitmap, dimensions, renderOptions);
    }
    
    // 結果のImageBitmapを生成
    const resultBitmap = offscreenCanvas.transferToImageBitmap();
    
    return {
        imageBitmap: resultBitmap,
        dimensions: dimensions,
        renderOptions: renderOptions
    };
}

/**
 * 直接描画
 */
async function renderDirect(imageBitmap, dimensions, options) {
    const { canvasWidth, canvasHeight, imgWidth, imgHeight } = dimensions;
    
    if (options.splitMode) {
        // 分割表示
        const sourceX = options.splitSide === 'left' ? 0 : imgWidth / 2;
        const sourceWidth = imgWidth / 2;
        
        ctx.drawImage(
            imageBitmap,
            sourceX, 0, sourceWidth, imgHeight,
            0, 0, canvasWidth, canvasHeight
        );
    } else {
        // 通常表示
        ctx.drawImage(
            imageBitmap,
            0, 0, imgWidth, imgHeight,
            0, 0, canvasWidth, canvasHeight
        );
    }
}

/**
 * Progressive Loading での描画
 */
async function renderProgressive(imageBitmap, dimensions, options) {
    const stages = [
        { scale: 0.25, quality: 'low' },
        { scale: 0.5, quality: 'medium' },
        { scale: 1.0, quality: 'high' }
    ];
    
    for (const stage of stages) {
        // 品質設定
        ctx.imageSmoothingQuality = stage.quality;
        
        // 段階的サイズ
        const stageWidth = dimensions.canvasWidth * stage.scale;
        const stageHeight = dimensions.canvasHeight * stage.scale;
        
        // 背景クリア
        ctx.clearRect(0, 0, dimensions.canvasWidth, dimensions.canvasHeight);
        
        if (options.splitMode) {
            const sourceX = options.splitSide === 'left' ? 0 : dimensions.imgWidth / 2;
            const sourceWidth = dimensions.imgWidth / 2;
            
            ctx.drawImage(
                imageBitmap,
                sourceX, 0, sourceWidth, dimensions.imgHeight,
                0, 0, stageWidth, stageHeight
            );
        } else {
            ctx.drawImage(
                imageBitmap,
                0, 0, dimensions.imgWidth, dimensions.imgHeight,
                0, 0, stageWidth, stageHeight
            );
        }
        
        // 最終段階でない場合は少し待機
        if (stage.scale < 1.0) {
            await sleep(8); // 8ms待機
        }
    }
}

/**
 * バッチレンダリング処理
 */
async function processBatchRender(batchData, requestId) {
    const { requests } = batchData;
    const results = [];
    
    const startTime = performance.now();
    
    try {
        for (let i = 0; i < requests.length; i++) {
            const request = requests[i];
            const result = await renderImage(request);
            
            results.push({
                index: i,
                ...result
            });
            
            // 進捗報告
            postMessage({
                type: 'batch_progress',
                progress: (i + 1) / requests.length,
                currentIndex: i,
                id: requestId
            });
        }
        
        const totalTime = performance.now() - startTime;
        
        // 結果を転送（ImageBitmap配列）
        const imageBitmaps = results.map(r => r.imageBitmap);
        
        postMessage({
            type: 'batch_complete',
            data: results,
            totalTime: totalTime,
            id: requestId
        }, imageBitmaps);
        
        console.log(`OffscreenWorker: バッチレンダリング完了 ${requests.length}件 ${totalTime.toFixed(2)}ms`);
        
    } catch (error) {
        console.error('OffscreenWorker: バッチレンダリングエラー:', error);
        postMessage({
            type: 'batch_error',
            error: error.message,
            id: requestId
        });
    }
}

/**
 * レンダリング品質の設定
 */
function setRenderingQuality(quality) {
    switch (quality) {
        case 'performance':
            ctx.imageSmoothingQuality = 'low';
            break;
        case 'balanced':
            ctx.imageSmoothingQuality = 'medium';
            break;
        case 'high-quality':
        default:
            ctx.imageSmoothingQuality = 'high';
            break;
    }
}

/**
 * レンダリングキューのクリア
 */
function clearRenderingQueue() {
    renderingQueue = [];
    isProcessing = false;
    console.log('OffscreenWorker: レンダリングキューをクリア');
}

/**
 * Worker統計情報の取得
 */
function getWorkerStats() {
    return {
        hasOffscreenCanvas: hasOffscreenCanvas,
        hasImageBitmap: hasImageBitmap,
        canvasSize: offscreenCanvas ? {
            width: offscreenCanvas.width,
            height: offscreenCanvas.height
        } : null,
        queueLength: renderingQueue.length,
        isProcessing: isProcessing,
        memoryUsage: self.performance && self.performance.memory ? {
            used: self.performance.memory.usedJSHeapSize,
            total: self.performance.memory.totalJSHeapSize,
            limit: self.performance.memory.jsHeapSizeLimit
        } : null
    };
}

/**
 * スリープ関数
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * エラーハンドリング
 */
self.addEventListener('error', function(e) {
    console.error('OffscreenWorker: グローバルエラー:', e.error);
    postMessage({
        type: 'worker_error',
        error: e.error.message,
        filename: e.filename,
        lineno: e.lineno
    });
});

self.addEventListener('unhandledrejection', function(e) {
    console.error('OffscreenWorker: 未処理のPromise拒否:', e.reason);
    postMessage({
        type: 'worker_unhandled_rejection',
        reason: e.reason.toString()
    });
});

/**
 * ImageBitmap を直接使用したレンダリング（fetch不要版）
 */
async function renderImageBitmap(renderData) {
    const {
        imageBitmap,
        dimensions,
        renderOptions
    } = renderData;
    
    // Canvas サイズの設定
    offscreenCanvas.width = dimensions.canvasWidth;
    offscreenCanvas.height = dimensions.canvasHeight;
    
    // 既に作成済みのImageBitmapを使用（fetch不要）
    
    // 背景クリア
    ctx.clearRect(0, 0, dimensions.canvasWidth, dimensions.canvasHeight);
    
    // レンダリング品質の設定
    setRenderingQuality(renderOptions.quality);
    
    // 分割表示の処理（縦横比維持）
    if (renderOptions.splitMode) {
        const sourceWidth = imageBitmap.width;
        const sourceHeight = imageBitmap.height;
        
        // 元画像の半分のアスペクト比
        const splitImgAspect = (sourceWidth / 2) / sourceHeight;
        const canvasAspect = dimensions.canvasWidth / dimensions.canvasHeight;
        
        // 縦横比を維持した描画サイズの計算
        let drawWidth, drawHeight, offsetX, offsetY;
        
        if (splitImgAspect > canvasAspect) {
            // 横長の半分画像：幅基準でフィット
            drawWidth = dimensions.canvasWidth;
            drawHeight = dimensions.canvasWidth / splitImgAspect;
            offsetX = 0;
            offsetY = (dimensions.canvasHeight - drawHeight) / 2;
        } else {
            // 縦長の半分画像：高さ基準でフィット
            drawHeight = dimensions.canvasHeight;
            drawWidth = dimensions.canvasHeight * splitImgAspect;
            offsetX = (dimensions.canvasWidth - drawWidth) / 2;
            offsetY = 0;
        }
        
        // 分割描画
        if (renderOptions.splitSide === 'left') {
            // 左半分を縦横比を維持して描画
            ctx.drawImage(
                imageBitmap,
                0, 0, sourceWidth / 2, sourceHeight, // ソース：左半分
                offsetX, offsetY, drawWidth, drawHeight // デスティネーション：縦横比維持
            );
        } else {
            // 右半分を縦横比を維持して描画
            ctx.drawImage(
                imageBitmap,
                sourceWidth / 2, 0, sourceWidth / 2, sourceHeight, // ソース：右半分
                offsetX, offsetY, drawWidth, drawHeight // デスティネーション：縦横比維持
            );
        }
    } else {
        // 通常表示
        const sourceWidth = imageBitmap.width;
        const sourceHeight = imageBitmap.height;
        
        // アスペクト比を維持しながら描画
        const aspectRatio = sourceWidth / sourceHeight;
        const targetAspectRatio = dimensions.canvasWidth / dimensions.canvasHeight;
        
        let drawWidth, drawHeight, drawX, drawY;
        
        if (aspectRatio > targetAspectRatio) {
            // 横長画像：幅をキャンバスに合わせる
            drawWidth = dimensions.canvasWidth;
            drawHeight = dimensions.canvasWidth / aspectRatio;
            drawX = 0;
            drawY = (dimensions.canvasHeight - drawHeight) / 2;
        } else {
            // 縦長画像：高さをキャンバスに合わせる
            drawHeight = dimensions.canvasHeight;
            drawWidth = dimensions.canvasHeight * aspectRatio;
            drawX = (dimensions.canvasWidth - drawWidth) / 2;
            drawY = 0;
        }
        
        ctx.drawImage(imageBitmap, drawX, drawY, drawWidth, drawHeight);
    }
    
    // レンダリング結果をImageBitmapとして返す
    return await createImageBitmap(offscreenCanvas);
}

console.log('OffscreenWorker: 初期化完了');