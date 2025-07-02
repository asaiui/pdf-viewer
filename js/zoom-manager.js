/**
 * ズーム・表示制御機能
 */
class ZoomManager {
    constructor(viewer) {
        this.viewer = viewer;
        this.initializeEventListeners();
    }

    zoomIn() {
        this.viewer.currentZoom = Math.min(this.viewer.currentZoom * 1.2, 5.0);
        this.viewer.scale = this.viewer.baseScale * this.viewer.currentZoom;
        this.renderCurrentPage();
        this.updateZoomDisplay();
        this.updateCanvasClass();
    }

    zoomOut() {
        this.viewer.currentZoom = Math.max(this.viewer.currentZoom / 1.2, 0.3);
        this.viewer.scale = this.viewer.baseScale * this.viewer.currentZoom;
        this.renderCurrentPage();
        this.updateZoomDisplay();
        this.updateCanvasClass();
    }

    setZoom(zoomLevel) {
        this.viewer.currentZoom = Math.max(0.3, Math.min(5.0, zoomLevel));
        this.viewer.scale = this.viewer.baseScale * this.viewer.currentZoom;
        this.renderCurrentPage();
        this.updateZoomDisplay();
        this.updateCanvasClass();
    }

    fitToWidth() {
        // 幅に合わせる場合はより大きく表示
        this.viewer.currentZoom = 1.3;
        this.renderCurrentPage();
        this.updateZoomDisplay();
        this.updateCanvasClass();
    }

    fitToPage() {
        // 全体表示でもデフォルトより大きく
        this.viewer.currentZoom = 1.1;
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

        // マウスホイールでのズーム（Ctrl押下時）
        this.viewer.canvas.addEventListener('wheel', (e) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                if (e.deltaY < 0) {
                    this.zoomIn();
                } else {
                    this.zoomOut();
                }
            }
        });

        // リサイズ対応
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.renderCurrentPage();
            }, 250);
        });
    }
}
