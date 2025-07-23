/**
 * イベントマネージャー - 全イベントリスナーの一元管理
 * メモリリーク防止、パフォーマンス向上、デバッグ支援
 */
class EventManager {
    constructor(viewer) {
        this.viewer = viewer;
        this.dom = window.domCache;
        
        // イベントリスナー管理
        this.eventMap = new Map();
        this.delegatedEvents = new Map();
        this.keyboardHandlers = new Map();
        
        // パフォーマンス監視
        this.eventStats = {
            totalListeners: 0,
            activeListeners: 0,
            removedListeners: 0,
            delegatedListeners: 0
        };
        
        // デバウンス/スロットル管理
        this.debounceTimers = new Map();
        this.throttleLastCall = new Map();
        
        this.initialize();
    }
    
    initialize() {
        this.setupNavigationEvents();
        this.setupZoomEvents();
        this.setupKeyboardEvents();
        this.setupMobileMenuEvents();
        this.setupTocEvents();
        this.setupResizeEvents();
        this.setupInputEvents();
        
        console.log('EventManager initialized:', this.getStats());
    }
    
    /**
     * イベントリスナーを追加（管理対象）
     */
    addListener(element, event, handler, options = {}) {
        if (!element) return null;
        
        const eventId = this.generateEventId();
        const wrappedHandler = this.wrapHandler(handler, options);
        
        // イベントリスナーを追加
        element.addEventListener(event, wrappedHandler, options);
        
        // 管理マップに登録
        this.eventMap.set(eventId, {
            element,
            event,
            handler: wrappedHandler,
            originalHandler: handler,
            options,
            timestamp: Date.now()
        });
        
        this.eventStats.totalListeners++;
        this.eventStats.activeListeners++;
        
        return eventId;
    }
    
    /**
     * イベントリスナーを削除
     */
    removeListener(eventId) {
        const eventData = this.eventMap.get(eventId);
        if (!eventData) return false;
        
        eventData.element.removeEventListener(
            eventData.event,
            eventData.handler,
            eventData.options
        );
        
        this.eventMap.delete(eventId);
        this.eventStats.activeListeners--;
        this.eventStats.removedListeners++;
        
        return true;
    }
    
    /**
     * イベント委譲（親要素での一括管理）
     */
    addDelegatedListener(parentElement, selector, event, handler, options = {}) {
        if (!parentElement) return null;
        
        const eventId = this.generateEventId();
        const delegatedHandler = (e) => {
            const target = e.target.closest(selector);
            if (target) {
                handler.call(target, e);
            }
        };
        
        parentElement.addEventListener(event, delegatedHandler, options);
        
        this.delegatedEvents.set(eventId, {
            parentElement,
            selector,
            event,
            handler: delegatedHandler,
            originalHandler: handler,
            options
        });
        
        this.eventStats.delegatedListeners++;
        
        return eventId;
    }
    
    /**
     * ナビゲーションイベントの設定
     */
    setupNavigationEvents() {
        // ページ移動ボタン
        const navigationButtons = [
            { id: 'firstPageBtn', action: () => this.viewer.firstPage() },
            { id: 'prevPageBtn', action: () => this.viewer.prevPage() },
            { id: 'nextPageBtn', action: () => this.viewer.nextPage() },
            { id: 'lastPageBtn', action: () => this.viewer.lastPage() }
        ];
        
        navigationButtons.forEach(({ id, action }) => {
            const element = this.dom.get(id);
            if (element) {
                this.addListener(element, 'click', action, { passive: true });
            }
        });
    }
    
    /**
     * ズームイベントの設定
     */
    setupZoomEvents() {
        const zoomButtons = [
            { id: 'zoomInBtn', action: () => this.viewer.zoomIn() },
            { id: 'zoomOutBtn', action: () => this.viewer.zoomOut() },
            { id: 'fitWidthBtn', action: () => this.viewer.fitToWidth() },
            { id: 'fitPageBtn', action: () => this.viewer.fitToPage() },
            { id: 'splitBtn', action: () => this.viewer.toggleSplitMode() },
            { id: 'fullscreenBtn', action: () => this.viewer.toggleFullscreen() }
        ];
        
        zoomButtons.forEach(({ id, action }) => {
            const element = this.dom.get(id);
            if (element) {
                this.addListener(element, 'click', action, { passive: true });
            }
        });
    }
    
    /**
     * キーボードイベントの設定
     */
    setupKeyboardEvents() {
        const keyboardMap = {
            'ArrowLeft': () => this.viewer.prevPage(),
            'ArrowUp': () => this.viewer.prevPage(),
            'PageUp': () => this.viewer.prevPage(),
            'ArrowRight': () => this.viewer.nextPage(),
            'ArrowDown': () => this.viewer.nextPage(),
            'PageDown': () => this.viewer.nextPage(),
            ' ': () => this.viewer.nextPage(), // スペースキー
            'Home': () => this.viewer.firstPage(),
            'End': () => this.viewer.lastPage(),
            '+': () => this.viewer.zoomIn(),
            '=': () => this.viewer.zoomIn(),
            '-': () => this.viewer.zoomOut(),
            '_': () => this.viewer.zoomOut(),
            'f': () => this.viewer.fitToPage(),
            'F': () => this.viewer.fitToPage(),
            'w': () => this.viewer.fitToWidth(),
            'W': () => this.viewer.fitToWidth(),
            's': () => this.viewer.toggleSplitMode(),
            'S': () => this.viewer.toggleSplitMode(),
            'F11': () => this.viewer.toggleFullscreen(),
            '?': () => this.viewer.showKeyboardHelp(),
            'Escape': () => this.handleEscape()
        };
        
        // キーボードハンドラーを保存
        this.keyboardHandlers = keyboardMap;
        
        const keyboardHandler = (e) => {
            // 入力フィールドにフォーカスがある場合は無視
            if (e.target.tagName === 'INPUT') return;
            
            const handler = keyboardMap[e.key];
            if (handler) {
                e.preventDefault();
                handler();
            }
        };
        
        this.addListener(document, 'keydown', keyboardHandler, { passive: false });
    }
    
    /**
     * モバイルメニューイベントの設定
     */
    setupMobileMenuEvents() {
        const menuToggle = this.dom.get('menuToggle');
        const overlay = this.dom.get('overlay');
        
        if (menuToggle) {
            this.addListener(menuToggle, 'click', () => {
                this.viewer.toggleMobileMenu();
            }, { passive: true });
        }
        
        if (overlay) {
            this.addListener(overlay, 'click', () => {
                this.viewer.closeMobileMenu();
            }, { passive: true });
        }
    }
    
    /**
     * 目次イベントの設定（イベント委譲）
     */
    setupTocEvents() {
        const sidebar = this.dom.get('sidebar');
        if (sidebar) {
            this.addDelegatedListener(sidebar, '.toc-link', 'click', (e) => {
                e.preventDefault();
                
                const linkElement = e.target.closest('.toc-link');
                const pageNumber = parseInt(linkElement.dataset.page);
                
                if (pageNumber && !isNaN(pageNumber)) {
                    this.viewer.goToPage(pageNumber, true);
                    this.viewer.closeMobileMenu();
                }
            }, { passive: false });
        }
    }
    
    /**
     * リサイズイベントの設定（デバウンス付き）
     */
    setupResizeEvents() {
        const resizeHandler = this.debounce(() => {
            this.viewer.renderPage();
        }, 250);
        
        this.addListener(window, 'resize', resizeHandler, { passive: true });
    }
    
    /**
     * 入力イベントの設定
     */
    setupInputEvents() {
        const pageInput = this.dom.get('pageInput');
        if (pageInput) {
            // ページ入力変更
            this.addListener(pageInput, 'change', (e) => {
                const pageNumber = parseInt(e.target.value);
                if (!isNaN(pageNumber)) {
                    this.viewer.goToPage(pageNumber);
                }
            }, { passive: true });
            
            // Enter キー処理
            this.addListener(pageInput, 'keydown', (e) => {
                if (e.key === 'Enter') {
                    const pageNumber = parseInt(e.target.value);
                    if (!isNaN(pageNumber)) {
                        this.viewer.goToPage(pageNumber);
                    }
                }
            }, { passive: false });
        }
        
        // 分割インジケーターのトグル
        const splitToggle = document.getElementById('splitToggle');
        if (splitToggle) {
            this.addListener(splitToggle, 'click', () => {
                this.viewer.toggleSplitSide();
            }, { passive: true });
            
            this.addListener(splitToggle, 'keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.viewer.toggleSplitSide();
                }
            }, { passive: false });
        }
    }
    
    /**
     * Escapeキーの処理
     */
    handleEscape() {
        this.viewer.hideKeyboardHelp();
        this.viewer.closeMobileMenu();
        
        if (document.fullscreenElement) {
            document.exitFullscreen();
        }
    }
    
    /**
     * イベントハンドラーをラップ（エラーハンドリング、パフォーマンス監視）
     */
    wrapHandler(handler, options = {}) {
        return (event) => {
            try {
                // パフォーマンス監視（開発時）
                if (options.monitor) {
                    const start = performance.now();
                    const result = handler(event);
                    const duration = performance.now() - start;
                    
                    if (duration > 16) { // 16ms超過時に警告
                        console.warn(`Slow event handler: ${duration.toFixed(2)}ms`);
                    }
                    
                    return result;
                }
                
                return handler(event);
            } catch (error) {
                console.error('Event handler error:', error);
                
                // エラー発生時の安全な処理
                if (options.fallback) {
                    options.fallback(error);
                }
            }
        };
    }
    
    /**
     * デバウンス関数
     */
    debounce(func, wait, key = 'default') {
        return (...args) => {
            const timer = this.debounceTimers.get(key);
            if (timer) {
                clearTimeout(timer);
            }
            
            const newTimer = setTimeout(() => {
                func.apply(this, args);
                this.debounceTimers.delete(key);
            }, wait);
            
            this.debounceTimers.set(key, newTimer);
        };
    }
    
    /**
     * スロットル関数
     */
    throttle(func, limit, key = 'default') {
        return (...args) => {
            const lastCall = this.throttleLastCall.get(key) || 0;
            const now = Date.now();
            
            if (now - lastCall >= limit) {
                this.throttleLastCall.set(key, now);
                return func.apply(this, args);
            }
        };
    }
    
    /**
     * カスタムイベントの発行
     */
    emit(eventType, detail = {}) {
        const event = new CustomEvent(eventType, {
            detail,
            bubbles: true,
            cancelable: true
        });
        
        document.dispatchEvent(event);
        return event;
    }
    
    /**
     * カスタムイベントの監視
     */
    on(eventType, handler, options = {}) {
        return this.addListener(document, eventType, handler, options);
    }
    
    /**
     * イベントIDの生成
     */
    generateEventId() {
        return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * 統計情報の取得
     */
    getStats() {
        return {
            ...this.eventStats,
            memoryEvents: this.eventMap.size,
            delegatedEvents: this.delegatedEvents.size,
            debounceTimers: this.debounceTimers.size,
            keyboardHandlers: Object.keys(this.keyboardHandlers).length
        };
    }
    
    /**
     * 特定カテゴリのイベントを無効化
     */
    disableCategory(category) {
        // 実装例：カテゴリ別の無効化
        switch (category) {
            case 'keyboard':
                // キーボードイベントを一時無効化
                break;
            case 'touch':
                // タッチイベントを無効化
                break;
        }
    }
    
    /**
     * 全イベントリスナーをクリーンアップ
     */
    cleanup() {
        // 通常のイベントリスナー削除
        for (const [eventId, eventData] of this.eventMap) {
            eventData.element.removeEventListener(
                eventData.event,
                eventData.handler,
                eventData.options
            );
        }
        
        // 委譲されたイベントリスナー削除
        for (const [eventId, eventData] of this.delegatedEvents) {
            eventData.parentElement.removeEventListener(
                eventData.event,
                eventData.handler,
                eventData.options
            );
        }
        
        // タイマーをクリア
        for (const timer of this.debounceTimers.values()) {
            clearTimeout(timer);
        }
        
        // マップをクリア
        this.eventMap.clear();
        this.delegatedEvents.clear();
        this.debounceTimers.clear();
        this.throttleLastCall.clear();
        
        console.log('EventManager cleaned up');
    }
    
    /**
     * デバッグ情報の出力
     */
    debug() {
        console.group('EventManager Debug Info');
        console.log('Stats:', this.getStats());
        console.log('Active Events:', Array.from(this.eventMap.keys()));
        console.log('Delegated Events:', Array.from(this.delegatedEvents.keys()));
        console.log('Keyboard Handlers:', Object.keys(this.keyboardHandlers));
        console.groupEnd();
    }
}