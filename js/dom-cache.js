/**
 * DOMキャッシュマネージャー - 効率的なDOM要素管理
 * 重複するDOM検索を排除し、パフォーマンスを向上
 */
class DOMCache {
    constructor() {
        this.cache = new Map();
        this.lazyElements = new Map();
        this.initialized = false;
    }

    /**
     * 要素を取得（キャッシュ付き）
     */
    get(id) {
        if (this.cache.has(id)) {
            return this.cache.get(id);
        }

        const element = document.getElementById(id);
        if (element) {
            this.cache.set(id, element);
        }
        return element;
    }

    /**
     * 複数要素を一括取得
     */
    getMultiple(ids) {
        const elements = {};
        for (const id of ids) {
            elements[id] = this.get(id);
        }
        return elements;
    }

    /**
     * 遅延初期化用要素定義
     */
    defineLazy(name, selector) {
        this.lazyElements.set(name, selector);
    }

    /**
     * 遅延要素を取得
     */
    getLazy(name) {
        if (this.cache.has(name)) {
            return this.cache.get(name);
        }

        const selector = this.lazyElements.get(name);
        if (!selector) return null;

        const element = typeof selector === 'string' 
            ? document.querySelector(selector)
            : selector();
            
        if (element) {
            this.cache.set(name, element);
        }
        return element;
    }

    /**
     * 要素の存在確認
     */
    exists(id) {
        return this.get(id) !== null;
    }

    /**
     * キャッシュを部分的にクリア
     */
    clear(id) {
        if (id) {
            this.cache.delete(id);
        } else {
            this.cache.clear();
        }
    }

    /**
     * 全てのキャッシュを更新
     */
    refresh() {
        this.cache.clear();
        this.initialized = false;
    }

    /**
     * 必須要素の事前キャッシュ
     */
    preloadCritical() {
        const criticalElements = [
            'pageInput', 'totalPages', 'loadingIndicator',
            'progressFill', 'progressText', 'svgContainer',
            'pdfViewerContainer', 'zoomDisplay', 'appLoading',
            'splitBtn', 'firstPageBtn', 'prevPageBtn', 'nextPageBtn', 'lastPageBtn',
            'zoomInBtn', 'zoomOutBtn', 'fitWidthBtn', 'fitPageBtn', 'fullscreenBtn'
        ];

        criticalElements.forEach(id => this.get(id));
        this.initialized = true;
    }

    /**
     * DOM変更監視（MutationObserver）
     */
    startObserving() {
        if (this.observer) return;

        this.observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    // 削除されたノードのキャッシュをクリア
                    mutation.removedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE && node.id) {
                            this.cache.delete(node.id);
                        }
                    });
                }
            });
        });

        this.observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    /**
     * リソース解放
     */
    destroy() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        this.cache.clear();
        this.lazyElements.clear();
    }

    /**
     * デバッグ情報取得
     */
    getStats() {
        return {
            cacheSize: this.cache.size,
            lazyElements: this.lazyElements.size,
            initialized: this.initialized,
            elements: Array.from(this.cache.keys())
        };
    }
}

// グローバルインスタンス
window.domCache = new DOMCache();

// DOM読み込み完了後に重要要素をプリロード
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.domCache.preloadCritical();
        window.domCache.startObserving();
    });
} else {
    window.domCache.preloadCritical();
    window.domCache.startObserving();
}