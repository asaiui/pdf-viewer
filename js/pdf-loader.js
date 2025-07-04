/**
 * PDF読み込み・レンダリング機能
 */
class PDFLoader {
    constructor(viewer) {
        this.viewer = viewer;
        this.pdf = null;
        this.currentRenderTask = null;
        this.isRendering = false;
        this.renderTimeout = null;
    }

    async loadPDF(pdfUrl) {
        try {
            this.viewer.updateProgress(0, '初期化中...');

            // ファイルの存在確認を先に実行
            const fileExists = await this.checkFileExists(pdfUrl);
            if (!fileExists) {
                throw new Error(`PDFファイルが見つかりません: ${pdfUrl}`);
            }

            // より確実な読み込み設定（CMap最適化・修正版）
            const loadingTask = pdfjsLib.getDocument({
                url: pdfUrl,
                disableRange: false,
                disableStream: false,
                disableAutoFetch: false,
                cMapPacked: true,
                cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
                standardFontDataUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/standard_fonts/',
                httpHeaders: {
                    'Cache-Control': 'no-cache'
                },
                maxImageSize: 4096 * 4096,
                stopAtErrors: false,
                // CMapの基本設定を追加
                useOnlyCssZoom: false,
                useSystemFonts: false
            });

            // プログレス表示
            loadingTask.onProgress = (progress) => {
                if (progress.total > 0) {
                    const percent = Math.round((progress.loaded / progress.total) * 100);
                    this.viewer.updateProgress(percent * 0.8, `ダウンロード中... ${percent}%`);
                }
            };

            // タイムアウト付きで読み込み
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('PDF読み込みタイムアウト')), 30000)
            );

            this.pdf = await Promise.race([loadingTask.promise, timeoutPromise]);
            this.viewer.totalPages = this.pdf.numPages;
            this.viewer.totalPagesSpan.textContent = this.viewer.totalPages;
            this.viewer.sidebarTotalPages.textContent = `${this.viewer.totalPages}ページ`;

            this.viewer.updateProgress(85, 'PDF解析完了');

            // 最初のページを即座にレンダリング
            await this.renderPage(this.viewer.currentPage);
            this.viewer.updateControls();
            this.viewer.updateZoomDisplay();

            this.viewer.updateProgress(95, 'レンダリング完了');

            // UIの表示切り替え
            setTimeout(() => {
                this.viewer.updateProgress(100, '読み込み完了');
                
                setTimeout(() => {
                    this.viewer.loadingIndicator.style.display = 'none';
                    this.viewer.canvas.style.display = 'block';
                    this.viewer.canvas.classList.add('fade-in');
                }, 300);
            }, 200);

            // バックグラウンドタスクは遅延実行
            setTimeout(() => {
                this.preloadAdjacentPages();
                if (this.viewer.contentAnalyzer) {
                    this.viewer.contentAnalyzer.analyzePDFContent(this.pdf);
                }
            }, 1000);

            return true;

        } catch (error) {
            console.error('PDF読み込みエラー:', error);
            
            let errorMessage = 'PDFの読み込みに失敗しました。';
            if (error.message.includes('タイムアウト')) {
                errorMessage = 'PDF読み込みがタイムアウトしました。ネットワーク接続を確認してください。';
            } else if (error.message.includes('404') || error.message.includes('Not Found') || error.message.includes('見つかりません')) {
                errorMessage = 'PDFファイルが見つかりません。ファイルパスを確認してください。';
            } else if (error.message.includes('CORS')) {
                errorMessage = 'PDFファイルのアクセス権限がありません。';
            }
            
            this.viewer.showError(errorMessage + ' デモ表示に切り替えます。');
            return false;
        }
    }

    // ファイルの存在確認
    async checkFileExists(url) {
        try {
            const response = await fetch(url, { method: 'HEAD' });
            return response.ok;
        } catch (error) {
            console.warn(`ファイル存在確認エラー: ${url}`, error);
            return false;
        }
    }

    async renderPage(pageNumber = this.viewer.currentPage, forceRender = false) {
        console.log('🔧 PDFLoader.renderPage called - pageNumber:', pageNumber, 'PDFLoader.pdf:', !!this.pdf, 'viewer.pdf:', !!this.viewer.pdf, 'totalPages:', this.viewer.totalPages);
        
        // PDFLoaderのPDFインスタンスがない場合は、viewerから取得
        const pdf = this.pdf || this.viewer.pdf;
        if (!pdf) {
            console.warn('PDF not loaded in PDFLoader');
            return;
        }

        // ページ番号の妥当性チェック
        if (pageNumber < 1 || pageNumber > this.viewer.totalPages) {
            console.warn(`Invalid page number: ${pageNumber}`);
            return;
        }

        // プログレッシブローダーからキャッシュされたページを取得
        if (this.viewer.progressiveLoader && !forceRender) {
            const cachedPage = this.viewer.progressiveLoader.getCachedPage(pageNumber);
            if (cachedPage) {
                return this.renderCachedPage(cachedPage, pageNumber);
            }
        }

        // 既に同じページをレンダリング中の場合はスキップ
        if (!forceRender && this.isRendering && this.currentRenderTask && this.currentRenderTask.pageNumber === pageNumber) {
            console.log(`Page ${pageNumber} is already being rendered, skipping`);
            return;
        }

        // 進行中のレンダリングをキャンセル
        if (this.currentRenderTask) {
            console.log(`Cancelling previous render task for page ${this.currentRenderTask.pageNumber}`);
            this.currentRenderTask.cancel();
        }

        // 前回のレンダリングリソースをクリーンアップ
        this.cleanupPreviousRender();

        this.isRendering = true;

        try {
            const startTime = performance.now();
            const page = await pdf.getPage(pageNumber);
            
            if (!this.isRendering) return;

            const container = document.getElementById('pdfViewerContainer');
            const containerWidth = container.clientWidth - 20;
            const containerHeight = container.clientHeight - 20;

            const viewport = page.getViewport({ scale: 1.0 });

            // 自動スケール計算（より大きく表示するよう改善）
            const scaleWidth = containerWidth / viewport.width;
            const scaleHeight = containerHeight / viewport.height;
            this.viewer.baseScale = Math.max(scaleWidth * 1.1, Math.min(scaleWidth, scaleHeight) * 1.2);
            this.viewer.scale = this.viewer.baseScale * this.viewer.currentZoom;

            const scaledViewport = page.getViewport({ scale: this.viewer.scale });

            // 並列レンダリングを優先使用
            if (this.viewer.parallelRenderer) {
                try {
                    const result = await this.viewer.parallelRenderer.renderPageParallel(
                        pageNumber, 
                        this.viewer.scale, 
                        'normal'
                    );
                    
                    console.log(`並列レンダリング完了: ${result.renderTime.toFixed(2)}ms (Worker ${result.workerId})`);
                    return;
                    
                } catch (error) {
                    console.warn('並列レンダリング失敗、通常レンダリングにフォールバック:', error);
                }
            }

            // 通常のオフスクリーンレンダリング
            const outputScale = window.devicePixelRatio || 1;
            
            // オフスクリーンキャンバスでのレンダリング
            const offscreenCanvas = this.createOptimizedCanvas(
                Math.floor(scaledViewport.width * outputScale),
                Math.floor(scaledViewport.height * outputScale)
            );
            
            const offscreenCtx = offscreenCanvas.getContext('2d');
            const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;

            const renderContext = {
                canvasContext: offscreenCtx,
                viewport: scaledViewport,
                transform: transform,
                intent: 'display',
                enableWebGL: true,
                textLayerMode: 0
            };

            // レンダリングタスクを作成
            const renderTask = page.render(renderContext);
            this.currentRenderTask = {
                task: renderTask,
                pageNumber: pageNumber,
                cancelled: false,
                cancel: () => {
                    try {
                        renderTask.cancel();
                        this.currentRenderTask.cancelled = true;
                        this.isRendering = false;
                        console.log(`Render task for page ${pageNumber} cancelled`);
                    } catch (error) {
                        console.warn('Error cancelling render task:', error);
                    }
                }
            };

            await renderTask.promise;

            // キャンセルされていた場合は処理を中断
            if (this.currentRenderTask && this.currentRenderTask.cancelled) {
                console.log(`Render task for page ${pageNumber} was cancelled, aborting`);
                return;
            }

            // オフスクリーンキャンバスからメインキャンバスに転送
            this.transferToMainCanvas(offscreenCanvas, scaledViewport);

            // レンダリング完了後の処理
            if (pageNumber === this.viewer.currentPage) {
                this.viewer.updateActiveTocItem();
                const renderTime = performance.now() - startTime;
                console.log(`ページ ${pageNumber} オフスクリーンレンダリング時間: ${renderTime.toFixed(2)}ms`);
                
                // パフォーマンス監視にレンダリング時間を記録
                if (this.viewer.performanceMonitor) {
                    this.viewer.performanceMonitor.recordPageRenderTime(pageNumber, renderTime);
                }
            }

        } catch (error) {
            if (error.name === 'RenderingCancelledException') {
                console.log(`ページ ${pageNumber} のレンダリングがキャンセルされました`);
            } else {
                console.error('ページ描画エラー:', error);
                this.viewer.showDemoContent();
            }
        } finally {
            this.isRendering = false;
            this.currentRenderTask = null;
        }
    }

    // デバウンス処理付きレンダリング
    debouncedRenderPage(pageNumber) {
        if (this.renderTimeout) {
            clearTimeout(this.renderTimeout);
        }

        this.renderTimeout = setTimeout(() => {
            this.renderPage(pageNumber);
        }, 50);
    }

    // 隣接ページのプリロード
    async preloadAdjacentPages() {
        if (!this.pdf) return;

        const pagesToPreload = [];
        
        if (this.viewer.currentPage < this.viewer.totalPages) {
            pagesToPreload.push(this.viewer.currentPage + 1);
        }

        pagesToPreload.forEach(async (pageNum) => {
            try {
                const pagePromise = this.pdf.getPage(pageNum);
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('プリロードタイムアウト')), 3000)
                );
                
                await Promise.race([pagePromise, timeoutPromise]);
                console.log(`ページ ${pageNum} をプリロードしました`);
            } catch (error) {
                console.warn(`ページ ${pageNum} のプリロードに失敗:`, error);
            }
        });
    }

    // キャッシュされたページのレンダリング
    async renderCachedPage(cachedPageData, pageNumber) {
        console.log(`🚀 Rendering cached page ${pageNumber}`, cachedPageData);
        
        const startTime = performance.now();
        
        try {
            this.isRendering = true;
            
            const { page, viewport } = cachedPageData;
            
            // コンテナサイズの再計算
            const container = document.getElementById('pdfViewerContainer');
            const containerWidth = container.clientWidth - 20;
            const containerHeight = container.clientHeight - 20;

            // スケール再計算
            const scaleWidth = containerWidth / viewport.width;
            const scaleHeight = containerHeight / viewport.height;
            this.viewer.baseScale = Math.max(scaleWidth * 1.1, Math.min(scaleWidth, scaleHeight) * 1.2);
            this.viewer.scale = this.viewer.baseScale * this.viewer.currentZoom;

            const scaledViewport = page.getViewport({ scale: this.viewer.scale });

            // Canvas設定
            const outputScale = window.devicePixelRatio || 1;
            this.viewer.canvas.width = Math.floor(scaledViewport.width * outputScale);
            this.viewer.canvas.height = Math.floor(scaledViewport.height * outputScale);
            this.viewer.canvas.style.width = Math.floor(scaledViewport.width) + 'px';
            this.viewer.canvas.style.height = Math.floor(scaledViewport.height) + 'px';

            const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;

            const renderContext = {
                canvasContext: this.viewer.ctx,
                viewport: scaledViewport,
                transform: transform,
                intent: 'display',
                enableWebGL: true,
                textLayerMode: 0
            };

            // レンダリングタスクを作成
            const renderTask = page.render(renderContext);
            this.currentRenderTask = {
                task: renderTask,
                pageNumber: pageNumber,
                cancel: () => {
                    renderTask.cancel();
                    this.isRendering = false;
                }
            };

            await renderTask.promise;

            // レンダリング完了後の処理
            if (pageNumber === this.viewer.currentPage) {
                this.viewer.updateActiveTocItem();
                const renderTime = performance.now() - startTime;
                console.log(`キャッシュページ ${pageNumber} レンダリング時間: ${renderTime.toFixed(2)}ms`);
            }

        } catch (error) {
            if (error.name === 'RenderingCancelledException') {
                console.log(`キャッシュページ ${pageNumber} のレンダリングがキャンセルされました`);
            } else {
                console.error('キャッシュページ描画エラー:', error);
                // キャッシュに問題がある場合は通常のレンダリングにフォールバック
                return this.renderPage(pageNumber, true);
            }
        } finally {
            this.isRendering = false;
            this.currentRenderTask = null;
        }
    }

    // 前回のレンダリングリソースをクリーンアップ
    cleanupPreviousRender() {
        if (this.currentRenderTask) {
            this.currentRenderTask.cancel();
            this.currentRenderTask = null;
        }
        
        // Canvas context の状態をリセット
        const canvas = this.viewer.canvas;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // メモリ使用量が多い場合は明示的なガベージコレクション要求
        this.requestGarbageCollection();
    }

    // ガベージコレクション要求
    requestGarbageCollection() {
        if ('memory' in performance) {
            const memory = performance.memory;
            const usedMB = memory.usedJSHeapSize / 1024 / 1024;
            const limitMB = memory.jsHeapSizeLimit / 1024 / 1024;
            
            // メモリ使用量が60%を超えた場合
            if (usedMB / limitMB > 0.6) {
                // ブラウザの内部ガベージコレクションを促進
                if (window.gc) {
                    window.gc();
                }
                
                // 手動でのメモリ解放処理
                this.performManualMemoryCleanup();
            }
        }
    }

    // 手動メモリクリーンアップ
    performManualMemoryCleanup() {
        // 使用していないImageDataオブジェクトをクリア
        if (this.lastImageData) {
            this.lastImageData = null;
        }
        
        // 一時的なcanvas要素があれば削除
        const tempCanvases = document.querySelectorAll('canvas[data-temp="true"]');
        tempCanvases.forEach(canvas => canvas.remove());
        
        console.log('Manual memory cleanup performed');
    }

    // オフスクリーンキャンバスからメインキャンバスへの転送
    transferToMainCanvas(offscreenCanvas, viewport) {
        const mainCanvas = this.viewer.canvas;
        const mainCtx = this.viewer.ctx;
        
        // メインキャンバスのサイズ調整
        mainCanvas.width = offscreenCanvas.width;
        mainCanvas.height = offscreenCanvas.height;
        mainCanvas.style.width = Math.floor(viewport.width) + 'px';
        mainCanvas.style.height = Math.floor(viewport.height) + 'px';
        
        // 非同期転送でUIブロックを防止
        requestAnimationFrame(() => {
            if ('OffscreenCanvas' in window && offscreenCanvas instanceof OffscreenCanvas) {
                // OffscreenCanvasから直接転送
                mainCtx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
                const bitmap = offscreenCanvas.transferToImageBitmap();
                mainCtx.drawImage(bitmap, 0, 0);
                bitmap.close();
            } else {
                // 通常のCanvasから転送
                mainCtx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
                mainCtx.drawImage(offscreenCanvas, 0, 0);
                
                // 一時キャンバスをクリーンアップ
                if (offscreenCanvas.getAttribute('data-temp') === 'true') {
                    offscreenCanvas.remove();
                }
            }
        });
    }

    // オフスクリーンキャンバスの活用
    createOptimizedCanvas(width, height) {
        if ('OffscreenCanvas' in window) {
            return new OffscreenCanvas(width, height);
        } else {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            canvas.setAttribute('data-temp', 'true');
            return canvas;
        }
    }

    // リソース使用量の監視
    monitorResourceUsage() {
        if ('memory' in performance) {
            const memory = performance.memory;
            const stats = {
                used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
                total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
                limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024)
            };
            
            console.log(`Memory usage: ${stats.used}MB / ${stats.limit}MB (${((stats.used / stats.limit) * 100).toFixed(1)}%)`);
            return stats;
        }
        return null;
    }
}
