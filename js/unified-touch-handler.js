/**
 * 統合タッチハンドラー
 * TouchGestureManagerとMobileTouchHandlerの機能を統合
 * パフォーマンス向上とコード重複削除
 */
class UnifiedTouchHandler {
    constructor(viewer) {
        this.viewer = viewer;
        this.dom = window.domCache;
        
        // タッチデバイス検出
        this.isTouch = this.detectTouchDevice();
        this.isEnabled = this.isTouch && window.innerWidth <= 768;
        
        // コンテナ要素
        this.svgContainer = this.dom.get('svgContainer');
        this.pdfViewerContainer = this.dom.get('pdfViewerContainer');
        
        // タッチ状態管理
        this.touchState = {
            isActive: false,
            touches: [],
            startX: 0,
            startY: 0,
            currentX: 0,
            currentY: 0,
            startTime: 0,
            fingers: 0
        };
        
        // ジェスチャー設定
        this.config = {
            swipeThreshold: 50,
            swipeTimeThreshold: 500,
            tapTimeThreshold: 200,
            doubleTapInterval: 300,
            pinchThreshold: 0.1,
            panThreshold: 10
        };
        
        // ピンチズーム状態
        this.pinchState = {
            isZooming: false,
            initialDistance: 0,
            initialScale: 1,
            currentScale: 1,
            minScale: 0.5,
            maxScale: 4.0,
            centerX: 0,
            centerY: 0
        };
        
        // パン状態
        this.panState = {
            isPanning: false,
            translateX: 0,
            translateY: 0
        };
        
        // タップ検出
        this.lastTapTime = 0;
        this.tapTimeout = null;
        this.zoomIndicatorTimeout = null;
        
        if (this.isEnabled) {
            this.initialize();
        }
    }
    
    detectTouchDevice() {
        return ('ontouchstart' in window) || 
               (navigator.maxTouchPoints > 0) || 
               (navigator.msMaxTouchPoints > 0);
    }
    
    initialize() {
        if (!this.svgContainer) return;
        
        this.bindEvents();
        this.setupGesturesPrevention();
        console.log('UnifiedTouchHandler initialized');
    }
    
    bindEvents() {
        const container = this.svgContainer;
        
        // タッチイベント
        container.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        container.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        container.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
        container.addEventListener('touchcancel', this.handleTouchCancel.bind(this), { passive: false });
        
        // 長押し無効化
        container.addEventListener('contextmenu', (e) => e.preventDefault(), { passive: false });
    }
    
    setupGesturesPrevention() {
        // デフォルトジェスチャーを無効化
        document.addEventListener('touchmove', (e) => {
            if (this.touchState.isActive) {
                e.preventDefault();
            }
        }, { passive: false });
        
        // Safari専用ジェスチャー無効化
        ['gesturestart', 'gesturechange', 'gestureend'].forEach(event => {
            document.addEventListener(event, (e) => e.preventDefault(), { passive: false });
        });
    }
    
    handleTouchStart(e) {
        this.touchState.isActive = true;
        this.touchState.touches = Array.from(e.touches);
        this.touchState.fingers = e.touches.length;
        this.touchState.startTime = Date.now();
        
        if (e.touches.length === 1) {
            this.handleSingleTouchStart(e);
        } else if (e.touches.length === 2) {
            this.handlePinchStart(e);
        }
        
        // 2本指以上は無効化
        if (e.touches.length > 1) {
            e.preventDefault();
        }
    }
    
    handleSingleTouchStart(e) {
        const touch = e.touches[0];
        this.touchState.startX = this.touchState.currentX = touch.clientX;
        this.touchState.startY = this.touchState.currentY = touch.clientY;
        
        // ダブルタップ検出準備
        const now = Date.now();
        if (now - this.lastTapTime < this.config.doubleTapInterval) {
            this.handleDoubleTap(touch);
            this.lastTapTime = 0;
            clearTimeout(this.tapTimeout);
            return;
        }
        
        this.lastTapTime = now;
        this.tapTimeout = setTimeout(() => {
            if (this.lastTapTime === now) {
                this.handleSingleTap(touch);
            }
        }, this.config.doubleTapInterval);
    }
    
    handlePinchStart(e) {
        e.preventDefault();
        
        this.pinchState.isZooming = true;
        const touch1 = this.touchState.touches[0];
        const touch2 = this.touchState.touches[1];
        
        this.pinchState.initialDistance = this.getDistance(touch1, touch2);
        this.pinchState.initialScale = this.pinchState.currentScale;
        this.pinchState.centerX = (touch1.clientX + touch2.clientX) / 2;
        this.pinchState.centerY = (touch1.clientY + touch2.clientY) / 2;
    }
    
    handleTouchMove(e) {
        if (!this.touchState.isActive) return;
        
        this.touchState.touches = Array.from(e.touches);
        
        if (e.touches.length === 1 && !this.pinchState.isZooming) {
            this.handleSingleTouchMove(e);
        } else if (e.touches.length === 2) {
            this.handlePinchMove(e);
        }
    }
    
    handleSingleTouchMove(e) {
        const touch = e.touches[0];
        this.touchState.currentX = touch.clientX;
        this.touchState.currentY = touch.clientY;
        
        const deltaX = this.touchState.currentX - this.touchState.startX;
        const deltaY = this.touchState.currentY - this.touchState.startY;
        
        // 移動が閾値を超えた場合、タップをキャンセル
        if (Math.abs(deltaX) > this.config.panThreshold || Math.abs(deltaY) > this.config.panThreshold) {
            clearTimeout(this.tapTimeout);
            
            // ズーム中はパン、そうでなければスワイプとして処理
            if (this.pinchState.currentScale > 1) {
                this.handlePan(touch);
                e.preventDefault();
            }
        }
        
        e.preventDefault();
    }
    
    handlePinchMove(e) {
        e.preventDefault();
        
        const touches = Array.from(e.touches);
        if (touches.length !== 2) return;
        
        const touch1 = touches[0];
        const touch2 = touches[1];
        const currentDistance = this.getDistance(touch1, touch2);
        
        if (this.pinchState.initialDistance === 0) return;
        
        const scaleChange = currentDistance / this.pinchState.initialDistance;
        let newScale = this.pinchState.initialScale * scaleChange;
        
        newScale = Math.max(this.pinchState.minScale, 
                   Math.min(this.pinchState.maxScale, newScale));
        
        this.applyZoom(newScale);
    }
    
    handlePan(touch) {
        if (!this.panState.isPanning) {
            this.panState.isPanning = true;
        }
        
        const deltaX = touch.clientX - this.touchState.startX;
        const deltaY = touch.clientY - this.touchState.startY;
        
        this.panState.translateX += deltaX;
        this.panState.translateY += deltaY;
        
        this.touchState.startX = touch.clientX;
        this.touchState.startY = touch.clientY;
        
        this.applyTransform();
    }
    
    handleTouchEnd(e) {
        if (!this.touchState.isActive) return;
        
        this.touchState.touches = Array.from(e.touches);
        
        if (this.touchState.touches.length === 0) {
            // 全てのタッチ終了
            const duration = Date.now() - this.touchState.startTime;
            const deltaX = this.touchState.currentX - this.touchState.startX;
            const deltaY = this.touchState.currentY - this.touchState.startY;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            
            // スワイプ判定
            if (duration < this.config.swipeTimeThreshold && 
                distance > this.config.swipeThreshold &&
                this.pinchState.currentScale <= 1) {
                
                if (Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
                    this.handleSwipe(deltaX > 0 ? 'right' : 'left');
                }
            }
            
            this.resetTouchState();
        }
    }
    
    handleTouchCancel(e) {
        this.resetTouchState();
    }
    
    handleSingleTap(touch) {
        const rect = this.svgContainer.getBoundingClientRect();
        const relativeX = (touch.clientX - rect.left) / rect.width;
        const centerX = 0.5;
        
        // 画面領域でページ移動
        if (relativeX < centerX) {
            this.viewer.prevPage();
            this.showFeedback('前のページ');
        } else {
            this.viewer.nextPage();
            this.showFeedback('次のページ');
        }
    }
    
    handleDoubleTap(touch) {
        if (this.pinchState.currentScale === 1) {
            this.setZoom(2.0, touch.clientX, touch.clientY);
            this.showFeedback('ズームイン');
        } else {
            this.resetZoom();
            this.showFeedback('ズームリセット');
        }
    }
    
    handleSwipe(direction) {
        switch (direction) {
            case 'left':
                this.viewer.nextPage();
                this.showFeedback('次のページ');
                break;
            case 'right':
                this.viewer.prevPage();
                this.showFeedback('前のページ');
                break;
        }
    }
    
    // ズーム関連メソッド
    applyZoom(scale) {
        this.pinchState.currentScale = scale;
        this.applyTransform();
        this.updateZoomDisplay();
        
        // ビューアーのズーム値も同期
        if (this.viewer.svgViewer && this.viewer.svgViewer.setZoom) {
            this.viewer.currentZoom = scale;
            this.viewer.svgViewer.setZoom(scale);
        }
    }
    
    setZoom(scale, centerX = null, centerY = null) {
        if (centerX && centerY) {
            const rect = this.svgContainer.getBoundingClientRect();
            const relativeX = (centerX - rect.left) / rect.width;
            const relativeY = (centerY - rect.top) / rect.height;
            
            this.panState.translateX = -relativeX * (scale - 1) * rect.width;
            this.panState.translateY = -relativeY * (scale - 1) * rect.height;
        }
        
        this.pinchState.currentScale = scale;
        this.applyTransform();
        this.updateZoomDisplay();
    }
    
    resetZoom() {
        this.pinchState.currentScale = 1;
        this.panState.translateX = 0;
        this.panState.translateY = 0;
        this.applyTransform();
        this.updateZoomDisplay();
        
        // ビューアーの状態も同期
        if (this.viewer.svgViewer && this.viewer.svgViewer.setZoom) {
            this.viewer.currentZoom = 1;
            this.viewer.svgViewer.setZoom(1);
        }
    }
    
    applyTransform() {
        const svg = this.svgContainer.querySelector('svg');
        if (svg) {
            const transform = `scale(${this.pinchState.currentScale}) translate(${this.panState.translateX}px, ${this.panState.translateY}px)`;
            svg.style.transform = transform;
            
            // ズーム状態に応じてカーソル変更
            if (this.pinchState.currentScale > 1) {
                this.svgContainer.classList.add('zoomed');
            } else {
                this.svgContainer.classList.remove('zoomed');
            }
        }
    }
    
    updateZoomDisplay() {
        const percentage = Math.round(this.pinchState.currentScale * 100);
        
        const zoomDisplay = this.dom.get('zoomDisplay');
        const zoomLevelIndicator = this.dom.get('zoomLevelIndicator');
        
        if (zoomDisplay) {
            zoomDisplay.textContent = `${percentage}%`;
        }
        
        if (zoomLevelIndicator) {
            zoomLevelIndicator.textContent = `${percentage}%`;
            zoomLevelIndicator.style.opacity = '1';
            
            clearTimeout(this.zoomIndicatorTimeout);
            this.zoomIndicatorTimeout = setTimeout(() => {
                zoomLevelIndicator.style.opacity = '0';
            }, 1500);
        }
    }
    
    showFeedback(message) {
        // 触覚フィードバック
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
        
        // 視覚フィードバック
        const feedback = document.createElement('div');
        feedback.className = 'touch-feedback';
        feedback.textContent = message;
        feedback.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 14px;
            z-index: 9999;
            pointer-events: none;
            animation: touchFeedback 0.6s ease-out forwards;
        `;
        
        this.ensureFeedbackStyles();
        document.body.appendChild(feedback);
        
        setTimeout(() => {
            if (feedback.parentNode) {
                feedback.parentNode.removeChild(feedback);
            }
        }, 600);
    }
    
    ensureFeedbackStyles() {
        if (!document.getElementById('touch-feedback-style')) {
            const style = document.createElement('style');
            style.id = 'touch-feedback-style';
            style.textContent = `
                @keyframes touchFeedback {
                    0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
                    30% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                    100% { opacity: 0; transform: translate(-50%, -50%) scale(1.1); }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    resetTouchState() {
        this.touchState = {
            isActive: false,
            touches: [],
            startX: 0,
            startY: 0,
            currentX: 0,
            currentY: 0,
            startTime: 0,
            fingers: 0
        };
        
        this.pinchState.isZooming = false;
        this.pinchState.initialDistance = 0;
        this.panState.isPanning = false;
        
        clearTimeout(this.tapTimeout);
    }
    
    // ユーティリティメソッド
    getDistance(touch1, touch2) {
        const dx = touch1.clientX - touch2.clientX;
        const dy = touch1.clientY - touch2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    // リサイズ処理
    handleResize() {
        const wasEnabled = this.isEnabled;
        this.isEnabled = this.isTouch && window.innerWidth <= 768;
        
        if (wasEnabled !== this.isEnabled) {
            if (this.isEnabled) {
                this.initialize();
            } else {
                this.resetTouchState();
            }
        }
    }
    
    // 外部ズーム操作との同期
    syncWithViewer() {
        if (this.viewer.currentZoom) {
            this.pinchState.currentScale = this.viewer.currentZoom;
            this.applyTransform();
        }
    }
    
    // 有効化/無効化
    enable() {
        this.isEnabled = true;
        this.initialize();
    }
    
    disable() {
        this.isEnabled = false;
        this.resetTouchState();
    }
    
    // クリーンアップ
    destroy() {
        if (this.svgContainer) {
            this.svgContainer.removeEventListener('touchstart', this.handleTouchStart.bind(this));
            this.svgContainer.removeEventListener('touchmove', this.handleTouchMove.bind(this));
            this.svgContainer.removeEventListener('touchend', this.handleTouchEnd.bind(this));
            this.svgContainer.removeEventListener('touchcancel', this.handleTouchCancel.bind(this));
        }
        
        clearTimeout(this.tapTimeout);
        clearTimeout(this.zoomIndicatorTimeout);
    }
}

// リサイズイベント監視
window.addEventListener('resize', () => {
    if (window.unifiedTouchHandler) {
        window.unifiedTouchHandler.handleResize();
    }
});