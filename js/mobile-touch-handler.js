/**
 * モバイル専用タッチジェスチャーハンドラー
 * スワイプ、ピンチズーム、タップジェスチャーを統合管理
 */
class MobileTouchHandler {
    constructor(viewer) {
        this.viewer = viewer;
        this.isEnabled = window.innerWidth <= 768;
        
        // タッチ状態管理
        this.touchState = {
            isActive: false,
            startX: 0,
            startY: 0,
            currentX: 0,
            currentY: 0,
            startTime: 0,
            fingers: 0
        };
        
        // ジェスチャー設定
        this.config = {
            swipeThreshold: 50,        // スワイプ判定距離
            swipeTimeThreshold: 500,   // スワイプ判定時間
            tapTimeThreshold: 200,     // タップ判定時間
            doubleTapInterval: 300,    // ダブルタップ間隔
            pinchThreshold: 0.1        // ピンチズーム感度
        };
        
        // ダブルタップ検出用
        this.lastTapTime = 0;
        
        this.initialize();
    }
    
    initialize() {
        if (!this.isEnabled) return;
        
        const container = this.viewer.pdfViewerContainer || document.getElementById('pdfViewerContainer');
        if (!container) return;
        
        this.bindTouchEvents(container);
        this.setupPassiveListeners();
        
        console.log('MobileTouchHandler initialized');
    }
    
    bindTouchEvents(container) {
        // タッチイベント
        container.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        container.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        container.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
        container.addEventListener('touchcancel', this.handleTouchCancel.bind(this), { passive: false });
        
        // マウスイベント（デバッグ用）
        container.addEventListener('mousedown', this.handleMouseDown.bind(this));
        container.addEventListener('mousemove', this.handleMouseMove.bind(this));
        container.addEventListener('mouseup', this.handleMouseUp.bind(this));
    }
    
    setupPassiveListeners() {
        // スクロール防止
        document.addEventListener('touchmove', (e) => {
            if (this.touchState.isActive) {
                e.preventDefault();
            }
        }, { passive: false });
        
        // ダブルタップズーム防止
        document.addEventListener('gesturestart', (e) => e.preventDefault());
        document.addEventListener('gesturechange', (e) => e.preventDefault());
        document.addEventListener('gestureend', (e) => e.preventDefault());
    }
    
    handleTouchStart(e) {
        this.touchState.isActive = true;
        this.touchState.fingers = e.touches.length;
        this.touchState.startTime = Date.now();
        
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            this.touchState.startX = this.touchState.currentX = touch.clientX;
            this.touchState.startY = this.touchState.currentY = touch.clientY;
        }
        
        // 2本指以上のタッチは無効化
        if (e.touches.length > 1) {
            e.preventDefault();
        }
    }
    
    handleTouchMove(e) {
        if (!this.touchState.isActive || e.touches.length !== 1) return;
        
        const touch = e.touches[0];
        this.touchState.currentX = touch.clientX;
        this.touchState.currentY = touch.clientY;
        
        // スクロールを防ぐ
        e.preventDefault();
    }
    
    handleTouchEnd(e) {
        if (!this.touchState.isActive) return;
        
        const duration = Date.now() - this.touchState.startTime;
        const deltaX = this.touchState.currentX - this.touchState.startX;
        const deltaY = this.touchState.currentY - this.touchState.startY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        // タップ判定
        if (duration < this.config.tapTimeThreshold && distance < 10) {
            this.handleTap(this.touchState.startX, this.touchState.startY);
        }
        // スワイプ判定
        else if (duration < this.config.swipeTimeThreshold && distance > this.config.swipeThreshold) {
            // 横スワイプ（ページ移動）
            if (Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
                this.handleSwipe(deltaX > 0 ? 'right' : 'left');
            }
            // 縦スワイプ（分割エリア切り替え）
            else if (Math.abs(deltaY) > Math.abs(deltaX) * 1.5) {
                this.handleVerticalSwipe(deltaY > 0 ? 'down' : 'up');
            }
        }
        
        this.resetTouchState();
    }
    
    handleTouchCancel(e) {
        this.resetTouchState();
    }
    
    // マウスイベント（デバッグ・開発用）
    handleMouseDown(e) {
        if (window.innerWidth > 768) return; // PC環境では無効
        
        this.touchState.isActive = true;
        this.touchState.startX = this.touchState.currentX = e.clientX;
        this.touchState.startY = this.touchState.currentY = e.clientY;
        this.touchState.startTime = Date.now();
    }
    
    handleMouseMove(e) {
        if (!this.touchState.isActive || window.innerWidth > 768) return;
        
        this.touchState.currentX = e.clientX;
        this.touchState.currentY = e.clientY;
    }
    
    handleMouseUp(e) {
        if (!this.touchState.isActive || window.innerWidth > 768) return;
        
        const duration = Date.now() - this.touchState.startTime;
        const deltaX = this.touchState.currentX - this.touchState.startX;
        const distance = Math.abs(deltaX);
        
        if (duration < this.config.tapTimeThreshold && distance < 10) {
            this.handleTap(this.touchState.startX, this.touchState.startY);
        } else if (duration < this.config.swipeTimeThreshold && distance > this.config.swipeThreshold) {
            this.handleSwipe(deltaX > 0 ? 'right' : 'left');
        }
        
        this.resetTouchState();
    }
    
    handleTap(x, y) {
        const now = Date.now();
        const container = this.viewer.pdfViewerContainer || document.getElementById('pdfViewerContainer');
        const rect = container.getBoundingClientRect();
        const relativeX = x - rect.left;
        const centerX = rect.width / 2;
        
        // ダブルタップ検出
        if (now - this.lastTapTime < this.config.doubleTapInterval) {
            this.handleDoubleTap();
            this.lastTapTime = 0;
            return;
        }
        
        this.lastTapTime = now;
        
        // シングルタップ: ページ移動
        setTimeout(() => {
            if (this.lastTapTime === now) { // ダブルタップされなかった場合
                if (relativeX < centerX) {
                    this.viewer.prevPage();
                } else {
                    this.viewer.nextPage();
                }
            }
        }, this.config.doubleTapInterval);
    }
    
    handleDoubleTap() {
        // ダブルタップ: ズーム切り替え
        if (this.viewer.currentZoom > 1.0) {
            this.viewer.fitToPage();
        } else {
            this.viewer.fitToWidth();
        }
        
        this.showFeedback('ズーム切り替え');
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
    
    handleVerticalSwipe(direction) {
        // 分割モードでのみ縦スワイプを処理
        if (this.viewer.svgViewer && this.viewer.svgViewer.splitMode) {
            const success = this.viewer.svgViewer.handleSplitSwipe(direction);
            if (success) {
                const position = direction === 'up' ? '下半分' : '上半分';
                this.showFeedback(position);
            }
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
        
        // アニメーション CSS を追加
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
        
        document.body.appendChild(feedback);
        
        setTimeout(() => {
            if (feedback.parentNode) {
                feedback.parentNode.removeChild(feedback);
            }
        }, 600);
    }
    
    resetTouchState() {
        this.touchState = {
            isActive: false,
            startX: 0,
            startY: 0,
            currentX: 0,
            currentY: 0,
            startTime: 0,
            fingers: 0
        };
    }
    
    // 画面サイズ変更時の再初期化
    handleResize() {
        const wasEnabled = this.isEnabled;
        this.isEnabled = window.innerWidth <= 768;
        
        if (wasEnabled !== this.isEnabled) {
            if (this.isEnabled) {
                this.initialize();
                console.log('MobileTouchHandler enabled');
            } else {
                console.log('MobileTouchHandler disabled');
            }
        }
    }
    
    // 有効/無効切り替え
    enable() {
        this.isEnabled = true;
        this.initialize();
    }
    
    disable() {
        this.isEnabled = false;
        this.resetTouchState();
    }
}

// リサイズイベントの監視
window.addEventListener('resize', () => {
    if (window.mobileTouchHandler) {
        window.mobileTouchHandler.handleResize();
    }
});