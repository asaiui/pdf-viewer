/**
 * WebPビューア - 高性能画像ビューア
 * SVGビューアを簡素化してWebP専用に最適化
 */
class WebPViewer {
    constructor(viewer) {
        this.viewer = viewer;
        this.svgContainer = null;
        this.currentImage = null;
        this.imageCache = new Map();
        this.maxCacheSize = 15; // WebPは軽量なのでキャッシュサイズ増加
        this.preloadQueue = [];
        this.isLoading = false;
        
        // WebPサポート確認
        this.webpSupported = this.checkWebPSupport();
        
        this.initializeContainer();
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
     * WebPページの読み込みと表示
     */
    async loadSVGPage(pageNumber) {
        if (this.isLoading) {
            return;
        }

        this.isLoading = true;

        try {
            // プログレス表示
            this.viewer.updateProgress(20, `WebPページ ${pageNumber} を読み込み中...`);

            // キャッシュから確認
            const cacheKey = `page-${pageNumber}`;
            if (this.imageCache.has(cacheKey)) {
                this.displayWebP(this.imageCache.get(cacheKey));
                this.viewer.updateProgress(100, `✅ ページ ${pageNumber} 表示完了`);
                this.isLoading = false;
                return;
            }

            // WebP画像の読み込み
            const webpPath = this.getWebPPath(pageNumber);
            this.viewer.updateProgress(40, 'WebP画像を取得中...');
            const element = await this.createWebPElement(webpPath, pageNumber);
            this.viewer.updateProgress(90, 'レンダリング中...');

            // キャッシュに保存
            this.cacheImage(cacheKey, element.cloneNode(true));

            // 表示
            this.displayWebP(element);
            this.viewer.updateProgress(100, `✅ ページ ${pageNumber} 表示完了`);

            // プリロード開始
            this.schedulePreload(pageNumber);

        } catch (error) {
            this.viewer.updateProgress(0, `⚠️ ページ ${pageNumber} の読み込みに失敗`);
            this.showErrorPage(pageNumber, error);
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * WebPファイルパスの生成
     */
    getWebPPath(pageNumber) {
        // ページ番号を0から始まるインデックスに変換（page-0001 → 0000）
        const paddedNumber = (pageNumber - 1).toString().padStart(4, '0');
        return `Webp/d6c92958-05c8-49fb-9b61-3d3128509cfa-${paddedNumber}.webp`;
    }

    /**
     * WebP要素の作成
     */
    async createWebPElement(webpPath, pageNumber) {
        const img = document.createElement('img');
        img.src = webpPath;
        img.alt = `学校案内 ページ ${pageNumber}`;
        img.style.cssText = `
            max-width: 100%;
            max-height: 100%;
            width: auto;
            height: auto;
            display: block;
            margin: 0 auto;
            object-fit: contain;
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
     * WebPサポート確認
     */
    checkWebPSupport() {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        return canvas.toDataURL('image/webp').indexOf('webp') !== -1;
    }

    /**
     * WebP画像の表示
     */
    displayWebP(element) {
        // ローディング表示を隠してコンテナを表示
        if (this.viewer.loadingIndicator) {
            this.viewer.loadingIndicator.style.display = 'none';
        }
        this.svgContainer.style.display = 'flex';

        // 既存の画像をクリア
        this.svgContainer.innerHTML = '';

        // 新しいWebP要素を追加
        const clonedElement = element.cloneNode(true);
        this.svgContainer.appendChild(clonedElement);
        this.currentImage = clonedElement;

        // フェードインアニメーション
        this.svgContainer.style.opacity = '0';
        this.svgContainer.style.transition = 'opacity 0.3s ease-in-out';
        
        // 次のフレームで表示
        requestAnimationFrame(() => {
            this.svgContainer.style.opacity = '1';
        });
    }

    /**
     * 画像キャッシュ管理
     */
    cacheImage(key, imageElement) {
        // キャッシュサイズ制限
        if (this.imageCache.size >= this.maxCacheSize) {
            const firstKey = this.imageCache.keys().next().value;
            this.imageCache.delete(firstKey);
        }

        this.imageCache.set(key, imageElement);
    }

    /**
     * プリロードスケジューリング
     */
    schedulePreload(currentPage) {
        // 前後のページをプリロード対象に追加
        const preloadPages = [
            currentPage - 2,
            currentPage - 1,
            currentPage + 1,
            currentPage + 2,
            currentPage + 3
        ].filter(page => page >= 1 && page <= (this.viewer.totalPages || 30));

        preloadPages.forEach(page => {
            const cacheKey = `page-${page}`;
            if (!this.imageCache.has(cacheKey) && !this.preloadQueue.includes(page)) {
                this.preloadQueue.push(page);
            }
        });

        // プリロード実行
        this.executePreload();
    }

    /**
     * プリロード実行
     */
    async executePreload() {
        if (this.preloadQueue.length === 0 || this.isLoading) return;

        const pageToPreload = this.preloadQueue.shift();

        try {
            const webpPath = this.getWebPPath(pageToPreload);
            const element = await this.createWebPElement(webpPath, pageToPreload);
            
            const cacheKey = `page-${pageToPreload}`;
            this.cacheImage(cacheKey, element);
            
        } catch (error) {
            console.log(`プリロード失敗 ページ${pageToPreload}:`, error);
        }

        // 次のプリロードを遅延実行（300ms短縮）
        setTimeout(() => this.executePreload(), 200);
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
     * ズーム対応
     */
    setZoom(zoomLevel) {
        if (this.currentImage && this.svgContainer) {
            const scale = Math.max(0.3, Math.min(5.0, zoomLevel));
            this.svgContainer.style.transform = `scale(${scale})`;
            this.svgContainer.style.transformOrigin = 'center center';
        }
    }

    /**
     * リソースの解放
     */
    destroy() {
        // キャッシュクリア
        this.imageCache.clear();
        this.preloadQueue.length = 0;

        // DOM要素の削除
        if (this.svgContainer) {
            this.svgContainer.innerHTML = '';
        }
    }

    /**
     * WebPビューアー情報取得
     */
    getViewerInfo() {
        return {
            type: 'webp',
            cacheSize: this.imageCache.size,
            maxCacheSize: this.maxCacheSize,
            preloadQueue: this.preloadQueue.length,
            webpSupported: this.webpSupported
        };
    }
}