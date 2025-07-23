/**
 * PNGビューア - 高性能画像ビューア
 * AsyncManagerと連携してパフォーマンス最適化
 */
class PNGViewer {
    constructor(viewer) {
        this.viewer = viewer;
        this.svgContainer = null;
        this.currentImage = null;
        this.isLoading = false;
        
        // PNGサポート確認（常にtrueとする）
        this.pngSupported = true;
        
        // AsyncManagerとの統合
        this.asyncManager = null;
        
        // Canvas描画システム
        this.canvasRenderer = null;
        this.useCanvasRendering = true; // Canvas描画を優先使用
        
        // Progressive Loading システム
        this.progressiveLoader = null;
        this.useProgressiveLoading = false; // 一時的に無効化
        
        // IndexedDB 永続キャッシュ
        this.indexedDBManager = null;
        this.usePersistentCache = false; // 一時的に無効化
        
        // 分割表示機能
        this.splitMode = false;
        this.splitSide = 'left'; // 'left' or 'right'
        
        this.initializeContainer();
        this.initializeAsyncManager();
        this.initializeCanvasRenderer();
        this.initializeProgressiveLoader();
        this.initializeIndexedDB();
        
        // リサイズイベントリスナー追加
        this.setupResizeListener();
    }

    /**
     * 表示用コンテナの初期化
     */
    initializeContainer() {
        this.svgContainer = this.viewer.svgContainer;
        
        if (!this.svgContainer) {
            console.error('WebPコンテナが見つかりません');
            return;
        }
    }

    /**
     * AsyncManagerの初期化
     */
    initializeAsyncManager() {
        if (typeof AsyncManager !== 'undefined') {
            this.asyncManager = new AsyncManager(this.viewer);
        }
    }

    /**
     * Canvas描画システムの初期化
     */
    initializeCanvasRenderer() {
        if (typeof CanvasRenderer !== 'undefined' && this.useCanvasRendering) {
            this.canvasRenderer = new CanvasRenderer(this.viewer);
            console.log('WebPViewer: Canvas描画システム初期化完了');
        } else {
            console.log('WebPViewer: 従来のIMG描画を使用');
        }
    }

    /**
     * Progressive Loading システムの初期化
     */
    initializeProgressiveLoader() {
        if (typeof ProgressiveLoader !== 'undefined' && this.useProgressiveLoading) {
            this.progressiveLoader = new ProgressiveLoader(this.viewer);
            console.log('WebPViewer: Progressive Loading システム初期化完了');
        } else {
            console.log('WebPViewer: Progressive Loading使用せず');
        }
    }

    /**
     * IndexedDB 永続キャッシュの初期化
     */
    async initializeIndexedDB() {
        if (typeof IndexedDBManager !== 'undefined' && this.usePersistentCache) {
            try {
                this.indexedDBManager = new IndexedDBManager(this.viewer);
                console.log('WebPViewer: IndexedDB 永続キャッシュ初期化完了');
            } catch (error) {
                console.warn('WebPViewer: IndexedDB 初期化失敗:', error);
                this.indexedDBManager = null;
            }
        } else {
            console.log('WebPViewer: IndexedDB 永続キャッシュ使用せず');
        }
    }

    /**
     * リサイズイベントリスナーの設定
     */
    setupResizeListener() {
        let resizeTimeout;
        
        this.resizeHandler = () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                if (this.currentImage) {
                    // 現在表示中の画像スタイルを再計算
                    this.optimizeImageDisplay(this.currentImage);
                    this.applyWebPContainerStyles();
                }
            }, 150); // デバウンス
        };
        
        window.addEventListener('resize', this.resizeHandler);
        window.addEventListener('orientationchange', this.resizeHandler);
    }

    /**
     * WebPページの読み込みと表示
     */
    async loadSVGPage(pageNumber) {
        if (this.isLoading) {
            return;
        }

        this.isLoading = true;

        try {
            // プログレス表示
            this.viewer.updateProgress(10, `WebPページ ${pageNumber} を読み込み中...`);

            // IndexedDB 永続キャッシュからの取得を試行
            let imageData = null;
            if (this.indexedDBManager) {
                this.viewer.updateProgress(15, `キャッシュを確認中...`);
                try {
                    imageData = await this.indexedDBManager.getImage(pageNumber);
                    
                    if (imageData && imageData.img) {
                        console.log(`WebPViewer: IndexedDBキャッシュヒット page-${pageNumber}`);
                        this.viewer.updateProgress(90, `キャッシュから表示中...`);
                        await this.displayWebP(imageData);
                        this.viewer.updateProgress(100, `✅ ページ ${pageNumber} 表示完了 (キャッシュ)`);
                        return;
                    }
                } catch (error) {
                    console.warn('WebPViewer: IndexedDBキャッシュ取得失敗:', error);
                    // IndexedDBエラーの場合は続行してネットワークから取得
                }
            }

            this.viewer.updateProgress(25, `WebPページ ${pageNumber} をダウンロード中...`);

            // AsyncManagerが利用可能な場合は使用
            if (this.asyncManager) {
                imageData = await this.asyncManager.loadImageAsync(pageNumber, 'high');
                
                // IndexedDBに永続保存
                if (this.indexedDBManager && imageData) {
                    this.indexedDBManager.storeImage(pageNumber, imageData.img, {
                        quality: 'high',
                        source: 'async-manager'
                    }).catch(error => {
                        console.warn('IndexedDB保存失敗:', error);
                    });
                }
                
                this.displayWebP(imageData);
                
                // プリロード開始
                this.asyncManager.startPreloading(pageNumber);
                
            } else {
                // フォールバック：従来の方法
                await this.loadPNGFallback(pageNumber);
            }
            
            this.viewer.updateProgress(100, `✅ ページ ${pageNumber} 表示完了`);

        } catch (error) {
            this.viewer.updateProgress(0, `⚠️ ページ ${pageNumber} の読み込みに失敗`);
            this.showErrorPage(pageNumber, error);
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * PNGファイルパスの生成
     */
    getPNGPath(pageNumber) {
        // ページ番号をそのまま使用（1から30）
        const paddedNumber = pageNumber.toString().padStart(2, '0');
        return `IMG/PNG/school-guide-2026_ページ_${paddedNumber}.png`;
    }

    /**
     * PNG要素の作成
     */
    async createPNGElement(pngPath, pageNumber) {
        const img = document.createElement('img');
        img.src = pngPath;
        img.alt = `学校案内 ページ ${pageNumber}`;
        // PNG専用スタイル
        img.style.cssText = `
            max-width: 100%;
            max-height: 100%;
            width: auto;
            height: auto;
            display: block;
            margin: 0 auto;
            object-fit: contain;
            image-rendering: high-quality;
            image-rendering: -webkit-optimize-contrast;
            border-radius: 4px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        `;
        
        // 画像読み込み完了を待つ
        return new Promise((resolve, reject) => {
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('WebP読み込み失敗'));
            
            // タイムアウト設定（10秒）
            setTimeout(() => {
                reject(new Error('WebP読み込みタイムアウト'));
            }, 10000);
        });
    }

    /**
     * フォールバック用の従来読み込み方法（AsyncManagerなしの場合）
     */
    async loadPNGFallback(pageNumber) {
        try {
            console.log(`PNGViewer: フォールバック読み込み page-${pageNumber}`);
            
            // PNG画像の読み込み
            const pngPath = this.getPNGPath(pageNumber);
            console.log(`PNGViewer: PNGパス生成: ${pngPath}`);
            
            this.viewer.updateProgress(40, 'PNG画像を取得中...');
            const element = await this.createPNGElement(pngPath, pageNumber);
            this.viewer.updateProgress(90, 'レンダリング中...');

            // lastImageDataを設定（ページ番号付き）
            this.lastImageData = {
                img: element,
                url: webpPath,
                pageNumber: pageNumber
            };

            // 従来の方式で直接表示
            await this.displayWithCanvasOrFallback(element);
            
        } catch (error) {
            console.error('WebPViewer: フォールバック読み込み失敗:', error);
            this.showErrorPage(pageNumber, error);
        }
    }

    /**
     * WebP画像の表示（Canvas描画対応）
     */
    async displayWebP(imageData) {
        // ローディング表示を隠してコンテナを表示
        if (this.viewer.loadingIndicator) {
            this.viewer.loadingIndicator.style.display = 'none';
        }

        // WebP専用のコンテナスタイル適用
        this.applyWebPContainerStyles();
        this.svgContainer.style.display = 'flex';

        // 既存の表示内容をクリア
        this.svgContainer.innerHTML = '';

        let img;
        
        // 画像データの取得
        if (imageData && imageData.img) {
            // AsyncManagerまたはIndexedDBからのデータ
            img = imageData.img;
            // Original URLを保持
            if (!imageData.url && img.src) {
                imageData.url = this.getPNGPath(pageNumber);
            }
            this.lastImageData = imageData; // ズーム用に保存
        } else if (imageData instanceof HTMLImageElement) {
            // 従来のelement
            img = imageData;
            // HTMLImageElementの場合はオブジェクトに変換してURLを保持
            this.lastImageData = {
                img: img,
                url: this.getPNGPath(pageNumber)
            };
        } else if (imageData && typeof imageData === 'object') {
            // IndexedDBからの復元データの可能性
            console.log('WebPViewer: IndexedDBデータ形式を確認', imageData);
            
            // IndexedDBから復元された画像データの処理
            if (imageData.img && imageData.img instanceof HTMLImageElement) {
                img = imageData.img;
                this.lastImageData = imageData;
            } else {
                console.error('WebPViewer: IndexedDBデータ形式が無効:', imageData);
                // フォールバック：ネットワークから再読み込み
                await this.loadWebPFromNetwork();
                return;
            }
        } else {
            console.error('WebPViewer: 無効な画像データ:', typeof imageData, imageData);
            // フォールバック：ネットワークから再読み込み
            await this.loadWebPFromNetwork();
            return;
        }

        // Progressive Loading を使用する場合（現在無効化中）
        if (this.progressiveLoader && this.useProgressiveLoading) {
            try {
                console.log('WebPViewer: Progressive Loading を使用');
                
                const renderOptions = {
                    zoom: this.viewer.currentZoom || 1.0,
                    splitMode: this.splitMode,
                    splitSide: this.splitSide,
                    quality: 'high-quality'
                };

                await this.progressiveLoader.startProgressiveLoading(imageData, renderOptions);
                
                console.log('WebPViewer: Progressive Loading 完了');
                
            } catch (error) {
                console.error('WebPViewer: Progressive Loading失敗、フォールバック:', error);
                // フォールバック：Canvas描画または従来の方式
                await this.displayWithCanvasOrFallback(img);
            }
        } else {
            // Canvas描画またはフォールバック（現在のメインフロー）
            console.log('WebPViewer: シンプル表示モードを使用');
            await this.displayWithCanvasOrFallback(img);
        }

        // フェードインアニメーション
        this.svgContainer.style.opacity = '0';
        this.svgContainer.style.transition = 'opacity 0.3s ease-in-out';
        
        // 次のフレームで表示
        requestAnimationFrame(() => {
            this.svgContainer.style.opacity = '1';
        });
    }

    /**
     * Canvas描画またはフォールバック
     */
    async displayWithCanvasOrFallback(img) {
        // Canvas描画システムを使用する場合
        if (this.canvasRenderer && this.useCanvasRendering) {
            try {
                console.log('WebPViewer: Canvas描画システムを使用');
                
                const renderOptions = {
                    zoom: this.viewer.currentZoom || 1.0,
                    splitMode: this.splitMode,
                    splitSide: this.splitSide,
                    progressive: false, // 単発描画
                    quality: 'high-quality'
                };

                const canvas = await this.canvasRenderer.renderImage(img, renderOptions);
                
                // Canvas要素をコンテナに追加
                this.svgContainer.appendChild(canvas);
                this.currentImage = canvas;
                
                console.log('WebPViewer: Canvas描画完了');
                
            } catch (error) {
                console.error('WebPViewer: Canvas描画失敗、フォールバック:', error);
                // フォールバック：従来の方式
                this.displayWebPFallback(img);
            }
        } else {
            // 従来のIMG要素での表示
            this.displayWebPFallback(img);
        }
    }

    /**
     * フォールバック：ネットワークからの再読み込み
     */
    async loadWebPFromNetwork() {
        console.log('WebPViewer: ネットワークから再読み込み');
        
        const pageNumber = this.viewer.currentPage;
        
        if (this.asyncManager) {
            try {
                const imageData = await this.asyncManager.loadImageAsync(pageNumber, 'high');
                await this.displayWithCanvasOrFallback(imageData.img);
            } catch (error) {
                console.error('WebPViewer: ネットワーク再読み込み失敗:', error);
                await this.loadPNGFallback(pageNumber);
            }
        } else {
            await this.loadPNGFallback(pageNumber);
        }
    }

    /**
     * フォールバック：従来のIMG表示方式
     */
    displayWebPFallback(img) {
        console.log('WebPViewer: フォールバックIMG表示');
        
        const imageElement = img.cloneNode(true);

        // WebP画像の最適化スタイルを再適用
        this.optimizeImageDisplay(imageElement);

        // 分割表示モードの適用
        this.applySplitMode(imageElement);

        // 新しいWebP要素を追加
        this.svgContainer.appendChild(imageElement);
        this.currentImage = imageElement;
    }

    /**
     * WebP専用コンテナスタイルの適用
     */
    applyWebPContainerStyles() {
        if (!this.svgContainer) return;

        // デバイスサイズを取得
        const isMobile = window.innerWidth <= 768;
        const isTablet = window.innerWidth <= 1023 && window.innerWidth > 768;
        
        // WebP用の最適化されたコンテナスタイル
        const containerStyle = {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: isMobile ? '8px' : '16px',
            minHeight: this.calculateMinHeight(),
            maxHeight: this.calculateMaxHeight(),
            overflow: 'auto',
            // WebP画像のアスペクト比に合わせた調整
            aspectRatio: isMobile ? 'auto' : '1.417'
        };

        Object.assign(this.svgContainer.style, containerStyle);
        
        // クラス名でWebPモードを識別
        this.svgContainer.classList.add('webp-mode');
        this.svgContainer.classList.remove('svg-mode');
    }

    /**
     * 画像表示の最適化
     */
    optimizeImageDisplay(imageElement) {
        const isMobile = window.innerWidth <= 768;
        const isTablet = window.innerWidth <= 1023 && window.innerWidth > 768;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let optimizedStyle;

        if (isMobile) {
            // モバイル: ビューポートに合わせたフィット
            optimizedStyle = `
                max-width: calc(100vw - 16px);
                max-height: calc(100vh - 140px);
                width: auto;
                height: auto;
                display: block;
                margin: 0 auto;
                object-fit: contain;
                image-rendering: high-quality;
                border-radius: 4px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            `;
        } else if (isTablet) {
            // タブレット: 適度なサイズ制限
            optimizedStyle = `
                max-width: calc(100vw - 32px);
                max-height: calc(100vh - 100px);
                width: auto;
                height: auto;
                display: block;
                margin: 0 auto;
                object-fit: contain;
                image-rendering: high-quality;
                border-radius: 6px;
                box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
            `;
        } else {
            // デスクトップ: より大きな表示
            const maxWidth = Math.min(viewportWidth * 0.9, 1200); // 最大1200pxまで
            const maxHeight = Math.min(viewportHeight * 0.85, 900); // 最大900pxまで
            
            optimizedStyle = `
                max-width: ${maxWidth}px;
                max-height: ${maxHeight}px;
                width: auto;
                height: auto;
                display: block;
                margin: 0 auto;
                object-fit: contain;
                image-rendering: high-quality;
                image-rendering: -webkit-optimize-contrast;
                border-radius: 8px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
                transition: transform 0.2s ease-in-out;
            `;
        }

        imageElement.style.cssText = optimizedStyle;
    }

    /**
     * 最小高さの計算
     */
    calculateMinHeight() {
        const headerHeight = 48;
        const controlsHeight = window.innerWidth <= 768 ? 80 : 60;
        const padding = window.innerWidth <= 768 ? 16 : 32;
        
        return `calc(100vh - ${headerHeight + controlsHeight + padding}px)`;
    }

    /**
     * 最大高さの計算
     */
    calculateMaxHeight() {
        const headerHeight = 48;
        const controlsHeight = window.innerWidth <= 768 ? 80 : 60;
        const padding = window.innerWidth <= 768 ? 16 : 32;
        
        return `calc(100vh - ${headerHeight + controlsHeight + padding}px)`;
    }


    /**
     * エラーページの表示
     */
    showErrorPage(pageNumber, error) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            width: 100%;
            height: 400px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background-color: #f8f9fa;
            border: 2px dashed #dc3545;
            border-radius: 8px;
            color: #dc3545;
            font-family: Arial, sans-serif;
        `;
        
        errorDiv.innerHTML = `
            <div style="font-size: 24px; margin-bottom: 16px;">⚠️</div>
            <div style="font-size: 18px; font-weight: bold; margin-bottom: 8px;">
                ページ ${pageNumber} の読み込みに失敗しました
            </div>
            <div style="font-size: 14px; color: #6c757d; margin-bottom: 16px;">
                ${error.message}
            </div>
            <div style="font-size: 12px; color: #868e96;">
                ページを再読み込みするか、他のページをお試しください
            </div>
        `;
        
        this.displayWebP(errorDiv);
    }

    /**
     * ズーム対応（Canvas描画対応）
     */
    async setZoom(zoomLevel) {
        const scale = Math.max(0.2, Math.min(8.0, zoomLevel)); // より広い範囲
        
        // Canvas描画を使用している場合は再描画
        if (this.canvasRenderer && this.useCanvasRendering && this.currentImage) {
            try {
                // 現在の画像データを取得（再読み込みが必要な場合）
                if (!this.lastImageData) {
                    console.warn('WebPViewer: 画像データが不足、ズーム変更をスキップ');
                    return;
                }
                
                console.log(`WebPViewer: ズーム変更 ${scale}x - Canvas再描画`);
                
                const renderOptions = {
                    zoom: scale,
                    splitMode: this.splitMode,
                    splitSide: this.splitSide,
                    progressive: false, // ズーム時はProgressive無効で高速化
                    quality: scale > 2.0 ? 'high-quality' : 'balanced'
                };

                const canvas = await this.canvasRenderer.renderImage(this.lastImageData, renderOptions);
                
                // 既存のCanvas要素を置き換え
                if (this.currentImage && this.currentImage.parentNode) {
                    this.currentImage.parentNode.replaceChild(canvas, this.currentImage);
                }
                this.currentImage = canvas;
                
            } catch (error) {
                console.error('WebPViewer: Canvas ズーム描画失敗:', error);
                // フォールバック：CSS transform
                this.setZoomFallback(scale);
            }
        } else {
            // 従来の CSS transform
            this.setZoomFallback(scale);
        }
        
        // 高倍率時のスクロール領域確保
        if (scale > 2.0) {
            this.svgContainer.classList.add('zoom-active');
            this.enableImageDragging();
        } else {
            this.svgContainer.classList.remove('zoom-active');
            this.disableImageDragging();
        }
    }

    /**
     * フォールバック：CSS transformでのズーム
     */
    setZoomFallback(scale) {
        if (this.currentImage) {
            this.currentImage.style.transform = `scale(${scale})`;
            this.currentImage.style.transformOrigin = 'center center';
            this.currentImage.style.transition = 'transform 0.2s ease-in-out';
        }
    }

    /**
     * 高倍率時の画像ドラッグ機能
     */
    enableImageDragging() {
        if (!this.currentImage || this.dragEnabled) return;
        
        let isDragging = false;
        let startX, startY, startScrollLeft, startScrollTop;
        
        const onMouseDown = (e) => {
            isDragging = true;
            this.svgContainer.style.cursor = 'grabbing';
            startX = e.clientX;
            startY = e.clientY;
            startScrollLeft = this.svgContainer.scrollLeft;
            startScrollTop = this.svgContainer.scrollTop;
            e.preventDefault();
        };
        
        const onMouseMove = (e) => {
            if (!isDragging) return;
            
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            this.svgContainer.scrollLeft = startScrollLeft - deltaX;
            this.svgContainer.scrollTop = startScrollTop - deltaY;
        };
        
        const onMouseUp = () => {
            isDragging = false;
            this.svgContainer.style.cursor = 'grab';
        };
        
        this.svgContainer.addEventListener('mousedown', onMouseDown);
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        
        // 後で削除できるよう保存
        this.dragListeners = { onMouseDown, onMouseMove, onMouseUp };
        this.dragEnabled = true;
    }

    /**
     * 画像ドラッグ機能を無効化
     */
    disableImageDragging() {
        if (!this.dragEnabled || !this.dragListeners) return;
        
        this.svgContainer.removeEventListener('mousedown', this.dragListeners.onMouseDown);
        document.removeEventListener('mousemove', this.dragListeners.onMouseMove);
        document.removeEventListener('mouseup', this.dragListeners.onMouseUp);
        
        this.dragListeners = null;
        this.dragEnabled = false;
    }

    /**
     * リソースの解放
     */
    destroy() {
        // ドラッグ機能の無効化
        this.disableImageDragging();
        
        // リサイズリスナーの削除
        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
            window.removeEventListener('orientationchange', this.resizeHandler);
        }
        
        // AsyncManagerのクリーンアップは AsyncManager 自体が行う
        if (this.asyncManager) {
            this.asyncManager.cleanup();
        }

        // DOM要素の削除とスタイルリセット
        if (this.svgContainer) {
            this.svgContainer.innerHTML = '';
            this.svgContainer.classList.remove('webp-mode', 'zoom-active');
            // コンテナスタイルをリセット
            this.svgContainer.removeAttribute('style');
        }
        
        // 参照をクリア
        this.currentImage = null;
        this.resizeHandler = null;
    }

    /**
     * 分割表示の切り替え（Canvas描画対応）
     */
    async toggleSplitMode() {
        console.log('WebPViewer.toggleSplitMode called');
        console.log('Current split mode:', this.splitMode);
        
        this.splitMode = !this.splitMode;
        console.log('New split mode:', this.splitMode);
        
        this.updateSplitIndicator();
        
        // Canvas描画を使用している場合は再描画
        if (this.canvasRenderer && this.useCanvasRendering && this.lastImageData) {
            try {
                console.log(`WebPViewer: 分割モード切り替え - ${this.splitMode ? '分割' : '通常'}`);
                
                const renderOptions = {
                    zoom: this.viewer.currentZoom || 1.0,
                    splitMode: this.splitMode,
                    splitSide: this.splitSide,
                    progressive: false,
                    quality: 'high-quality'
                };

                const canvas = await this.canvasRenderer.renderImage(this.lastImageData, renderOptions);
                
                // 既存のCanvas要素を置き換え
                if (this.currentImage && this.currentImage.parentNode) {
                    this.currentImage.parentNode.replaceChild(canvas, this.currentImage);
                }
                this.currentImage = canvas;
                
            } catch (error) {
                console.error('WebPViewer: Canvas 分割表示描画失敗:', error);
                // フォールバック
                if (this.currentImage) {
                    this.applySplitMode(this.currentImage);
                }
            }
        } else {
            // 従来の CSS クリッピング
            if (this.currentImage) {
                this.applySplitMode(this.currentImage);
            } else {
                console.warn('No current image to apply split mode');
            }
        }
        
        return this.splitMode;
    }

    /**
     * 分割サイドの切り替え（Canvas描画対応）
     */
    async toggleSplitSide() {
        if (!this.splitMode) return;
        
        this.splitSide = this.splitSide === 'left' ? 'right' : 'left';
        this.updateSplitIndicator();
        
        // Canvas描画を使用している場合は再描画
        if (this.canvasRenderer && this.useCanvasRendering && this.lastImageData) {
            try {
                console.log(`WebPViewer: 分割サイド切り替え - ${this.splitSide}`);
                
                const renderOptions = {
                    zoom: this.viewer.currentZoom || 1.0,
                    splitMode: this.splitMode,
                    splitSide: this.splitSide,
                    progressive: false,
                    quality: 'high-quality'
                };

                const canvas = await this.canvasRenderer.renderImage(this.lastImageData, renderOptions);
                
                // 既存のCanvas要素を置き換え
                if (this.currentImage && this.currentImage.parentNode) {
                    this.currentImage.parentNode.replaceChild(canvas, this.currentImage);
                }
                this.currentImage = canvas;
                
            } catch (error) {
                console.error('WebPViewer: Canvas 分割サイド描画失敗:', error);
                // フォールバック
                if (this.currentImage) {
                    this.applySplitMode(this.currentImage);
                }
            }
        } else {
            // 従来の CSS クリッピング
            if (this.currentImage) {
                this.applySplitMode(this.currentImage);
            }
        }
        
        return this.splitSide;
    }

    /**
     * 分割表示を画像に適用
     */
    applySplitMode(imageElement) {
        if (!imageElement) return;
        
        if (this.splitMode) {
            // 分割表示モード
            const clipPath = this.splitSide === 'left' 
                ? 'polygon(0% 0%, 50% 0%, 50% 100%, 0% 100%)' // 左半分
                : 'polygon(50% 0%, 100% 0%, 100% 100%, 50% 100%)'; // 右半分
            
            imageElement.style.clipPath = clipPath;
            imageElement.style.transformOrigin = this.splitSide === 'left' ? 'left center' : 'right center';
            
            // 分割時は2倍表示でディテール確保
            if (!imageElement.style.transform.includes('scale')) {
                imageElement.style.transform = 'scale(2)';
            }
            
        } else {
            // 通常表示モード
            imageElement.style.clipPath = 'none';
            imageElement.style.transformOrigin = 'center center';
            
            // スケールをリセット（ズーム設定がある場合はそれを維持）
            const currentTransform = imageElement.style.transform;
            if (currentTransform.includes('scale(2)') && !currentTransform.includes('scale(')) {
                imageElement.style.transform = 'none';
            }
        }
    }

    /**
     * 分割インジケーターの更新
     */
    updateSplitIndicator() {
        const indicator = document.getElementById('splitIndicator');
        const text = indicator?.querySelector('.split-text');
        
        if (indicator && text) {
            if (this.splitMode) {
                indicator.style.display = 'flex';
                text.textContent = this.splitSide === 'left' ? '左側表示' : '右側表示';
            } else {
                indicator.style.display = 'none';
            }
        }
    }

    /**
     * WebPビューアー情報取得
     */
    getViewerInfo() {
        const asyncStats = this.asyncManager ? this.asyncManager.getStats() : null;
        
        return {
            type: 'png',
            pngSupported: this.pngSupported,
            asyncManager: asyncStats,
            optimization: 'AsyncManager統合済み'
        };
    }
}

// グローバル参照
window.PNGViewer = PNGViewer;