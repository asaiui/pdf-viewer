/**
 * ズーム・表示制御機能
 */
class ZoomManager {
    constructor(viewer) {
        this.viewer = viewer;
        this.initializeEventListeners();
    }

    zoomIn() {
        // 現在のズームレベルに応じたステップ幅で細かい調整
        let step;
        if (this.viewer.currentZoom < 1.0) {
            step = 1.1; // 100%未満は10%ステップ
        } else if (this.viewer.currentZoom < 2.0) {
            step = 1.15; // 100-200%は15%ステップ  
        } else {
            step = 1.2; // 200%以上は20%ステップ
        }
        
        this.viewer.currentZoom = Math.min(this.viewer.currentZoom * step, 5.0);
        this.viewer.scale = this.viewer.baseScale * this.viewer.currentZoom;
        
        
        this.renderCurrentPage();
        this.updateZoomDisplay();
        this.updateCanvasClass();
    }

    zoomOut() {
        // 現在のズームレベルに応じたステップ幅で細かい調整
        let step;
        if (this.viewer.currentZoom <= 1.0) {
            step = 1.1; // 100%以下は10%ステップ
        } else if (this.viewer.currentZoom <= 2.0) {
            step = 1.15; // 100-200%は15%ステップ
        } else {
            step = 1.2; // 200%以上は20%ステップ
        }
        
        this.viewer.currentZoom = Math.max(this.viewer.currentZoom / step, 0.3);
        this.viewer.scale = this.viewer.baseScale * this.viewer.currentZoom;
        
        
        this.renderCurrentPage();
        this.updateZoomDisplay();
        this.updateCanvasClass();
    }

    setZoom(zoomLevel, animated = false) {
        const targetZoom = Math.max(0.3, Math.min(5.0, zoomLevel));
        
        if (animated && Math.abs(targetZoom - this.viewer.currentZoom) > 0.05) {
            this.animatedZoom(targetZoom);
        } else {
            this.viewer.currentZoom = targetZoom;
            this.viewer.scale = this.viewer.baseScale * this.viewer.currentZoom;
            this.renderCurrentPage();
            this.updateZoomDisplay();
            this.updateCanvasClass();
        }
    }

    // スムーズズームアニメーション
    async animatedZoom(targetZoom, duration = 300) {
        if (this.isAnimating) {
            return; // 既にアニメーション中の場合はスキップ
        }
        
        this.isAnimating = true;
        const startZoom = this.viewer.currentZoom;
        const startTime = performance.now();
        
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // easeOutCubic イージング関数
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            
            this.viewer.currentZoom = startZoom + (targetZoom - startZoom) * easeProgress;
            this.viewer.scale = this.viewer.baseScale * this.viewer.currentZoom;
            
            // レンダリングは最適化のため間引く
            if (progress === 1 || elapsed % 50 < 16) { // 約20FPS
                this.renderCurrentPage();
            }
            this.updateZoomDisplay();
            this.updateCanvasClass();
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.isAnimating = false;
            }
        };
        
        requestAnimationFrame(animate);
    }

    fitToWidth() {
        // コンテナサイズに基づいた動的な幅フィット計算
        const container = this.viewer.pdfViewerContainer;
        const containerWidth = container.clientWidth - 40; // パディングを考慮
        
        if (this.viewer.canvas.width > 0) {
            // 現在のキャンバスの実際の幅を取得
            const canvasDisplayWidth = this.viewer.canvas.offsetWidth || this.viewer.canvas.style.width.replace('px', '') || this.viewer.canvas.width / (window.devicePixelRatio || 1);
            const actualCanvasWidth = parseFloat(canvasDisplayWidth);
            
            if (actualCanvasWidth > 0) {
                // 幅フィット用のズーム個を計算
                const widthZoom = containerWidth / actualCanvasWidth;
                this.viewer.currentZoom = Math.max(0.3, Math.min(5.0, widthZoom * this.viewer.currentZoom));
            } else {
                // フォールバック: デフォルト値
                this.viewer.currentZoom = 1.3;
            }
        } else {
            // PDFがまだ読み込まれていない場合
            this.viewer.currentZoom = 1.3;
        }
        
        this.renderCurrentPage();
        this.updateZoomDisplay();
        this.updateCanvasClass();
    }

    fitToPage() {
        // コンテナサイズに基づいた動的なページフィット計算
        const container = this.viewer.pdfViewerContainer;
        const containerWidth = container.clientWidth - 40;
        const containerHeight = container.clientHeight - 40;
        
        if (this.viewer.canvas.width > 0 && this.viewer.canvas.height > 0) {
            // 現在のキャンバスの実際のサイズを取得
            const canvasDisplayWidth = this.viewer.canvas.offsetWidth || parseFloat(this.viewer.canvas.style.width) || this.viewer.canvas.width / (window.devicePixelRatio || 1);
            const canvasDisplayHeight = this.viewer.canvas.offsetHeight || parseFloat(this.viewer.canvas.style.height) || this.viewer.canvas.height / (window.devicePixelRatio || 1);
            
            if (canvasDisplayWidth > 0 && canvasDisplayHeight > 0) {
                // 幅と高さの両方を考慮したフィット率を計算
                const widthRatio = containerWidth / canvasDisplayWidth;
                const heightRatio = containerHeight / canvasDisplayHeight;
                const fitRatio = Math.min(widthRatio, heightRatio) * 0.95; // 5%のマージンを残す
                
                this.viewer.currentZoom = Math.max(0.3, Math.min(5.0, fitRatio * this.viewer.currentZoom));
            } else {
                // フォールバック: デフォルト値
                this.viewer.currentZoom = 1.1;
            }
        } else {
            // PDFがまだ読み込まれていない場合
            this.viewer.currentZoom = 1.1;
        }
        
        this.renderCurrentPage();
        this.updateZoomDisplay();
        this.updateCanvasClass();
    }

    updateZoomDisplay() {
        const percentage = Math.round(this.viewer.currentZoom * 100);
        if (this.viewer.zoomDisplay) {
            this.viewer.zoomDisplay.textContent = `${percentage}%`;
        }
        if (this.viewer.zoomLevelIndicator) {
            this.viewer.zoomLevelIndicator.textContent = `${percentage}%`;
        }
        
        // 全画面時の表示も更新
        const fullscreenZoomDisplay = document.getElementById('fullscreenZoomDisplay');
        if (fullscreenZoomDisplay) {
            fullscreenZoomDisplay.textContent = `${percentage}%`;
        }
        
        // 一時的なズーム表示（ユーザーフィードバック向上）
        this.showTemporaryZoomIndicator(percentage);
    }

    // 一時的なズーム表示（2秒間表示）
    showTemporaryZoomIndicator(percentage) {
        if (!this.viewer.zoomLevelIndicator) return;
        
        const indicator = this.viewer.zoomLevelIndicator;
        
        // 既存のタイマーをクリア
        if (this.zoomIndicatorTimeout) {
            clearTimeout(this.zoomIndicatorTimeout);
        }
        
        // 表示
        indicator.style.display = 'block';
        indicator.classList.add('show');
        indicator.classList.remove('hide');
        
        // 2秒後に非表示
        this.zoomIndicatorTimeout = setTimeout(() => {
            indicator.classList.add('hide');
            indicator.classList.remove('show');
            
            // アニメーション完了後に完全に非表示
            setTimeout(() => {
                if (indicator.classList.contains('hide')) {
                    indicator.style.display = 'none';
                }
            }, 300);
        }, 2000);
    }

    updateCanvasClass() {
        if (this.viewer.currentZoom > 1.1) {
            this.viewer.canvas.classList.add('zoomable', 'zoomed');
        } else {
            this.viewer.canvas.classList.remove('zoomable', 'zoomed');
        }
    }

    renderCurrentPage() {
        if (this.viewer.pdfLoader && this.viewer.pdfLoader.pdf) {
            this.viewer.pdfLoader.renderPage(this.viewer.currentPage, true);
        } else {
            this.viewer.showDemoContent();
        }
    }

    initializeEventListeners() {
        // ズームボタン
        document.getElementById('zoomInBtn').addEventListener('click', () => this.zoomIn());
        document.getElementById('zoomOutBtn').addEventListener('click', () => this.zoomOut());
        document.getElementById('fitWidthBtn').addEventListener('click', () => this.fitToWidth());
        document.getElementById('fitPageBtn').addEventListener('click', () => this.fitToPage());

        // 全画面時のズームボタン
        document.getElementById('fullscreenZoomInBtn').addEventListener('click', () => this.zoomIn());
        document.getElementById('fullscreenZoomOutBtn').addEventListener('click', () => this.zoomOut());

        // キーボードショートカット
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT') return;

            switch (e.key) {
                case '+':
                case '=':
                    e.preventDefault();
                    this.zoomIn();
                    break;
                case '-':
                case '_':
                    e.preventDefault();
                    this.zoomOut();
                    break;
                case 'f':
                case 'F':
                    if (e.ctrlKey || e.metaKey) {
                        return; // Ctrl+F は通常の検索として動作
                    }
                    e.preventDefault();
                    if (e.shiftKey) {
                        this.viewer.fullscreenManager.toggleFullscreen();
                    } else {
                        this.fitToPage();
                    }
                    break;
                case 'w':
                case 'W':
                    e.preventDefault();
                    this.fitToWidth();
                    break;
            }
        });

        // マウスホイールでのズーム（改善版）
        this.viewer.canvas.addEventListener('wheel', (e) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                
                // より細かいホイールズーム制御
                const delta = e.deltaY;
                const zoomFactor = delta > 0 ? 0.9 : 1.1; // 10%ずつの細かい調整
                const newZoom = this.viewer.currentZoom * zoomFactor;
                
                this.setZoom(newZoom, true); // アニメーション付きズーム
            }
        });

        // タッチ・ピンチズーム対応
        this.initializeTouchZoom();
        
        // パン機能の初期化
        this.initializePanZoom();

        // リサイズ対応
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.renderCurrentPage();
            }, 250);
        });
    }

    // タッチ・ピンチズーム対応
    initializeTouchZoom() {
        let initialDistance = 0;
        let initialZoom = 1;
        let touches = [];
        
        // タッチ開始
        this.viewer.canvas.addEventListener('touchstart', (e) => {
            touches = Array.from(e.touches);
            
            if (touches.length === 2) {
                e.preventDefault();
                initialDistance = this.getTouchDistance(touches);
                initialZoom = this.viewer.currentZoom;
            }
        }, { passive: false });
        
        // タッチ移動（ピンチズーム）
        this.viewer.canvas.addEventListener('touchmove', (e) => {
            if (e.touches.length === 2) {
                e.preventDefault();
                
                const currentDistance = this.getTouchDistance(Array.from(e.touches));
                const scale = currentDistance / initialDistance;
                const newZoom = Math.max(0.3, Math.min(5.0, initialZoom * scale));
                
                // リアルタイムでズーム更新（アニメーションなし）
                this.setZoom(newZoom, false);
            }
        }, { passive: false });
        
        // タッチ終了
        this.viewer.canvas.addEventListener('touchend', (e) => {
            if (touches.length === 2) {
            }
            touches = [];
        });
    }

    // 2点間の距離を計算
    getTouchDistance(touches) {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    // ズーム時のパン機能（高ズーム時のドラッグ移動）
    initializePanZoom() {
        let isDragging = false;
        let lastX, lastY;
        
        this.viewer.canvas.addEventListener('mousedown', (e) => {
            if (this.viewer.currentZoom > 1.2) {
                isDragging = true;
                lastX = e.clientX;
                lastY = e.clientY;
                this.viewer.canvas.style.cursor = 'grabbing';
                e.preventDefault();
            }
        });
        
        this.viewer.canvas.addEventListener('mousemove', (e) => {
            if (isDragging && this.viewer.currentZoom > 1.2) {
                const deltaX = e.clientX - lastX;
                const deltaY = e.clientY - lastY;
                
                // Canvas の位置を調整（transform を使用）
                const currentTransform = this.viewer.canvas.style.transform || 'translate(0px, 0px)';
                const matches = currentTransform.match(/translate\\(([^,]+),\\s*([^)]+)\\)/);
                const currentX = matches ? parseFloat(matches[1]) : 0;
                const currentY = matches ? parseFloat(matches[2]) : 0;
                
                this.viewer.canvas.style.transform = `translate(${currentX + deltaX}px, ${currentY + deltaY}px)`;
                
                lastX = e.clientX;
                lastY = e.clientY;
            }
        });
        
        this.viewer.canvas.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                this.viewer.canvas.style.cursor = this.viewer.currentZoom > 1.2 ? 'grab' : 'default';
            }
        });
        
        // マウスがキャンバス外に出た場合
        this.viewer.canvas.addEventListener('mouseleave', () => {
            if (isDragging) {
                isDragging = false;
                this.viewer.canvas.style.cursor = 'default';
            }
        });
    }

    // カーソルスタイルの更新
    updateCanvasClass() {
        const canvas = this.viewer.canvas;
        
        if (this.viewer.currentZoom > 1.1) {
            canvas.classList.add('zoomable', 'zoomed');
            canvas.style.cursor = this.viewer.currentZoom > 1.2 ? 'grab' : 'default';
        } else {
            canvas.classList.remove('zoomable', 'zoomed');
            canvas.style.cursor = 'default';
            canvas.style.transform = 'translate(0px, 0px)'; // パン位置をリセット
        }
    }
}
