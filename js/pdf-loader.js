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

            // より確実な読み込み設定
            const loadingTask = pdfjsLib.getDocument({
                url: pdfUrl,
                disableRange: false,
                disableStream: false,
                disableAutoFetch: false,
                cMapPacked: true,
                httpHeaders: {
                    'Cache-Control': 'no-cache'
                },
                maxImageSize: 4096 * 4096,
                stopAtErrors: false
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
        if (!this.pdf) return;

        // 既に同じページをレンダリング中の場合はスキップ
        if (!forceRender && this.isRendering && this.currentRenderTask && this.currentRenderTask.pageNumber === pageNumber) {
            return;
        }

        // 進行中のレンダリングをキャンセル
        if (this.currentRenderTask) {
            this.currentRenderTask.cancel();
        }

        this.isRendering = true;

        try {
            const startTime = performance.now();
            const page = await this.pdf.getPage(pageNumber);
            
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

            // Canvas解像度を高める（Retina対応）
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
                console.log(`ページ ${pageNumber} レンダリング時間: ${renderTime.toFixed(2)}ms`);
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
}
