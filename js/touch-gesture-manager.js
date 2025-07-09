/**
 * タッチジェスチャーマネージャー
 * - ピンチズーム対応
 * - スワイプページ切り替え
 * - タップ・ダブルタップ操作
 * - マルチタッチ対応
 */
class TouchGestureManager {
    constructor(viewer) {
        this.viewer = viewer;
        this.svgContainer = document.getElementById('svgContainer');
        
        // タッチ状態管理
        this.touches = [];
        this.isTouch = this.detectTouchDevice();
        this.isZooming = false;
        this.isPanning = false;
        this.lastTap = 0;
        this.tapTimeout = null;
        
        // ピンチズーム設定
        this.initialDistance = 0;
        this.initialScale = 1;
        this.currentScale = 1;
        this.minScale = 0.5;
        this.maxScale = 4.0;
        
        // スワイプ設定
        this.swipeStartX = 0;
        this.swipeStartY = 0;
        this.swipeThreshold = 50;
        this.swipeVelocityThreshold = 0.3;
        
        // パン設定
        this.panStartX = 0;
        this.panStartY = 0;
        this.currentTranslateX = 0;
        this.currentTranslateY = 0;
        
        if (this.isTouch) {
            this.initializeTouchEvents();
        }
    }
    
    detectTouchDevice() {
        return ('ontouchstart' in window) || 
               (navigator.maxTouchPoints > 0) || 
               (navigator.msMaxTouchPoints > 0);
    }
    
    initializeTouchEvents() {
        // タッチイベントの初期化
        this.svgContainer.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        this.svgContainer.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        this.svgContainer.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });
        this.svgContainer.addEventListener('touchcancel', this.handleTouchCancel.bind(this), { passive: true });
        
        // 長押し対応
        this.svgContainer.addEventListener('contextmenu', this.handleContextMenu.bind(this), { passive: false });
    }
    
    handleTouchStart(e) {
        this.touches = Array.from(e.touches);
        
        if (this.touches.length === 1) {
            // シングルタッチ - タップまたはパンの開始
            this.handleSingleTouchStart(e);
        } else if (this.touches.length === 2) {
            // ピンチズームの開始
            this.handlePinchStart(e);
        }
    }
    
    handleSingleTouchStart(e) {
        const touch = this.touches[0];
        this.swipeStartX = touch.clientX;
        this.swipeStartY = touch.clientY;
        this.panStartX = touch.clientX;
        this.panStartY = touch.clientY;
        
        // ダブルタップ検出
        const now = Date.now();
        if (now - this.lastTap < 300) {
            // ダブルタップ
            this.handleDoubleTap(touch);
            this.lastTap = 0;
        } else {
            this.lastTap = now;
            // シングルタップの遅延実行
            this.tapTimeout = setTimeout(() => {
                this.handleSingleTap(touch);
            }, 300);
        }
    }
    
    handlePinchStart(e) {
        e.preventDefault(); // デフォルトのズームを防ぐ
        
        this.isZooming = true;
        const touch1 = this.touches[0];
        const touch2 = this.touches[1];
        
        this.initialDistance = this.getDistance(touch1, touch2);
        this.initialScale = this.currentScale;
        
        // ピンチの中心点を取得
        this.pinchCenterX = (touch1.clientX + touch2.clientX) / 2;
        this.pinchCenterY = (touch1.clientY + touch2.clientY) / 2;
    }
    
    handleTouchMove(e) {
        if (this.touches.length === 1 && !this.isZooming) {
            // パンまたはスワイプ
            this.handleSingleTouchMove(e);
        } else if (this.touches.length === 2) {
            // ピンチズーム
            this.handlePinchMove(e);
        }
    }
    
    handleSingleTouchMove(e) {
        const touch = e.touches[0];
        const deltaX = touch.clientX - this.swipeStartX;
        const deltaY = touch.clientY - this.swipeStartY;
        
        // 移動距離が閾値を超えた場合、タップではなくスワイプ/パンとして処理
        if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
            clearTimeout(this.tapTimeout);
            
            // 現在のSVGがズームされている場合はパン、そうでなければスワイプ
            if (this.currentScale > 1) {
                this.handlePan(touch);
                e.preventDefault();
            } else {
                this.handleSwipe(touch);
            }
        }
    }
    
    handlePinchMove(e) {
        e.preventDefault();
        
        const touches = Array.from(e.touches);
        if (touches.length !== 2) return;
        
        const touch1 = touches[0];
        const touch2 = touches[1];
        const currentDistance = this.getDistance(touch1, touch2);
        
        if (this.initialDistance === 0) return;
        
        // ズーム倍率を計算
        const scaleChange = currentDistance / this.initialDistance;
        let newScale = this.initialScale * scaleChange;
        
        // スケールの制限
        newScale = Math.max(this.minScale, Math.min(this.maxScale, newScale));
        
        this.applyZoom(newScale);
    }
    
    handlePan(touch) {
        if (!this.isPanning) {
            this.isPanning = true;
        }
        
        const deltaX = touch.clientX - this.panStartX;
        const deltaY = touch.clientY - this.panStartY;
        
        this.currentTranslateX += deltaX;
        this.currentTranslateY += deltaY;
        
        this.panStartX = touch.clientX;
        this.panStartY = touch.clientY;
        
        this.applyTransform();
    }
    
    handleSwipe(touch) {
        const deltaX = touch.clientX - this.swipeStartX;
        const deltaY = touch.clientY - this.swipeStartY;
        
        // 横スワイプが縦スワイプより大きい場合のみ処理
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > this.swipeThreshold) {
            if (deltaX > 0) {
                // 右スワイプ - 前のページ
                this.viewer.pageNavigator.previousPage();
            } else {
                // 左スワイプ - 次のページ
                this.viewer.pageNavigator.nextPage();
            }
        }
    }
    
    handleTouchEnd(e) {
        this.touches = Array.from(e.touches);
        
        if (this.touches.length === 0) {
            // すべてのタッチが終了
            this.isZooming = false;
            this.isPanning = false;
            this.initialDistance = 0;
        } else if (this.touches.length === 1 && this.isZooming) {
            // ピンチからシングルタッチに変更
            this.isZooming = false;
            this.handleSingleTouchStart({ touches: this.touches });
        }
    }
    
    handleTouchCancel(e) {
        this.touches = [];
        this.isZooming = false;
        this.isPanning = false;
        this.initialDistance = 0;
        clearTimeout(this.tapTimeout);
    }
    
    handleSingleTap(touch) {
        // タップ位置でコントロールバーの表示/非表示を切り替え
        const rect = this.svgContainer.getBoundingClientRect();
        const relativeY = (touch.clientY - rect.top) / rect.height;
        
        if (relativeY > 0.8) {
            // 下部タップ - コントロールバー表示
            this.toggleControlsVisibility();
        } else if (relativeY < 0.2) {
            // 上部タップ - ヘッダー表示
            this.toggleHeaderVisibility();
        }
    }
    
    handleDoubleTap(touch) {
        // ダブルタップでズームイン/アウト
        if (this.currentScale === 1) {
            // ズームイン（2倍）
            this.setZoom(2.0, touch.clientX, touch.clientY);
        } else {
            // ズームリセット
            this.resetZoom();
        }
    }
    
    handleContextMenu(e) {
        // 長押しメニューを無効化（誤操作防止）
        e.preventDefault();
    }
    
    // ズーム関連メソッド
    applyZoom(scale) {
        this.currentScale = scale;
        this.applyTransform();
        
        // ズームレベル表示を更新
        this.updateZoomDisplay();
    }
    
    setZoom(scale, centerX = null, centerY = null) {
        if (centerX && centerY) {
            // 指定した点を中心にズーム
            const rect = this.svgContainer.getBoundingClientRect();
            const relativeX = (centerX - rect.left) / rect.width;
            const relativeY = (centerY - rect.top) / rect.height;
            
            // ズーム後の座標調整
            this.currentTranslateX = -relativeX * (scale - 1) * rect.width;
            this.currentTranslateY = -relativeY * (scale - 1) * rect.height;
        }
        
        this.currentScale = scale;
        this.applyTransform();
        this.updateZoomDisplay();
    }
    
    resetZoom() {
        this.currentScale = 1;
        this.currentTranslateX = 0;
        this.currentTranslateY = 0;
        this.applyTransform();
        this.updateZoomDisplay();
    }
    
    applyTransform() {
        const svg = this.svgContainer.querySelector('svg');
        if (svg) {
            const transform = `scale(${this.currentScale}) translate(${this.currentTranslateX}px, ${this.currentTranslateY}px)`;
            svg.style.transform = transform;
            
            // ズーム状態に応じてカーソルを変更
            if (this.currentScale > 1) {
                this.svgContainer.classList.add('zoomed');
            } else {
                this.svgContainer.classList.remove('zoomed');
            }
        }
    }
    
    updateZoomDisplay() {
        const zoomDisplay = document.getElementById('zoomDisplay');
        const zoomLevelIndicator = document.getElementById('zoomLevelIndicator');
        
        const percentage = Math.round(this.currentScale * 100);
        
        if (zoomDisplay) {
            zoomDisplay.textContent = `${percentage}%`;
        }
        
        if (zoomLevelIndicator) {
            zoomLevelIndicator.textContent = `${percentage}%`;
            zoomLevelIndicator.style.opacity = '1';
            
            // 一定時間後に非表示
            clearTimeout(this.zoomIndicatorTimeout);
            this.zoomIndicatorTimeout = setTimeout(() => {
                zoomLevelIndicator.style.opacity = '0';
            }, 1500);
        }
    }
    
    // UI表示制御
    toggleControlsVisibility() {
        const controls = document.getElementById('controls');
        if (controls) {
            controls.classList.toggle('hidden');
        }
    }
    
    toggleHeaderVisibility() {
        const header = document.querySelector('.header');
        if (header) {
            header.classList.toggle('hidden');
        }
    }
    
    // ユーティリティメソッド
    getDistance(touch1, touch2) {
        const dx = touch1.clientX - touch2.clientX;
        const dy = touch1.clientY - touch2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    // SVGビューアーとの連携
    syncWithViewer() {
        // 外部ズーム操作との同期
        if (this.viewer.zoomManager) {
            this.currentScale = this.viewer.zoomManager.currentZoom || 1;
            this.applyTransform();
        }
    }
    
    // クリーンアップ
    destroy() {
        if (this.svgContainer) {
            this.svgContainer.removeEventListener('touchstart', this.handleTouchStart.bind(this));
            this.svgContainer.removeEventListener('touchmove', this.handleTouchMove.bind(this));
            this.svgContainer.removeEventListener('touchend', this.handleTouchEnd.bind(this));
            this.svgContainer.removeEventListener('touchcancel', this.handleTouchCancel.bind(this));
            this.svgContainer.removeEventListener('contextmenu', this.handleContextMenu.bind(this));
        }
        
        clearTimeout(this.tapTimeout);
        clearTimeout(this.zoomIndicatorTimeout);
    }
}