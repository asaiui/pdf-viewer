/**
 * 全画面表示機能
 */
class FullscreenManager {
    constructor(viewer) {
        this.viewer = viewer;
        this.isFullscreen = false;
        this.initializeEventListeners();
    }

    toggleFullscreen() {
        if (this.isFullscreen) {
            this.exitFullscreen();
        } else {
            this.enterFullscreen();
        }
    }

    enterFullscreen() {
        this.isFullscreen = true;
        this.viewer.pdfViewerContainer.classList.add('fullscreen');
        
        // 全画面API使用（対応ブラウザ）
        if (this.viewer.pdfViewerContainer.requestFullscreen) {
            this.viewer.pdfViewerContainer.requestFullscreen().catch(console.warn);
        } else if (this.viewer.pdfViewerContainer.webkitRequestFullscreen) {
            this.viewer.pdfViewerContainer.webkitRequestFullscreen();
        } else if (this.viewer.pdfViewerContainer.mozRequestFullScreen) {
            this.viewer.pdfViewerContainer.mozRequestFullScreen();
        }

        // 全画面時のページ情報を更新
        this.updateFullscreenControls();
        
        // レンダリングし直し（画面サイズが変わったため）
        setTimeout(() => {
            if (this.viewer.pdfLoader && this.viewer.pdfLoader.pdf) {
                this.viewer.pdfLoader.renderPage(this.viewer.currentPage, true);
            } else {
                this.viewer.showDemoContent();
            }
        }, 100);
    }

    exitFullscreen() {
        this.isFullscreen = false;
        this.viewer.pdfViewerContainer.classList.remove('fullscreen');
        
        // 全画面API終了
        if (document.exitFullscreen) {
            document.exitFullscreen().catch(console.warn);
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        }

        // レンダリングし直し
        setTimeout(() => {
            if (this.viewer.pdfLoader && this.viewer.pdfLoader.pdf) {
                this.viewer.pdfLoader.renderPage(this.viewer.currentPage, true);
            } else {
                this.viewer.showDemoContent();
            }
        }, 100);
    }

    updateFullscreenControls() {
        const fullscreenCurrentPage = document.getElementById('fullscreenCurrentPage');
        const fullscreenTotalPages = document.getElementById('fullscreenTotalPages');
        
        if (fullscreenCurrentPage) {
            fullscreenCurrentPage.textContent = this.viewer.currentPage;
        }
        if (fullscreenTotalPages) {
            fullscreenTotalPages.textContent = this.viewer.totalPages || 57;
        }
    }

    initializeEventListeners() {
        // 全画面ボタン
        document.getElementById('fullscreenBtn').addEventListener('click', () => this.toggleFullscreen());
        
        // 全画面時のコントロール
        document.getElementById('fullscreenPrevBtn').addEventListener('click', () => {
            this.viewer.pageNavigator.prevPage();
        });
        document.getElementById('fullscreenNextBtn').addEventListener('click', () => {
            this.viewer.pageNavigator.nextPage();
        });
        document.getElementById('exitFullscreenBtn').addEventListener('click', () => this.exitFullscreen());

        // 全画面状態の変化を監視
        document.addEventListener('fullscreenchange', () => {
            if (!document.fullscreenElement && this.isFullscreen) {
                this.exitFullscreen();
            }
        });

        document.addEventListener('webkitfullscreenchange', () => {
            if (!document.webkitFullscreenElement && this.isFullscreen) {
                this.exitFullscreen();
            }
        });

        document.addEventListener('mozfullscreenchange', () => {
            if (!document.mozFullScreenElement && this.isFullscreen) {
                this.exitFullscreen();
            }
        });
    }
}