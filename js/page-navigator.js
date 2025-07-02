/**
 * ページナビゲーション・制御機能
 */
class PageNavigator {
    constructor(viewer) {
        this.viewer = viewer;
        this.initializeEventListeners();
    }

    goToPage(pageNumber) {
        const newPage = Math.max(1, Math.min(pageNumber, this.viewer.totalPages || 57));
        if (newPage !== this.viewer.currentPage) {
            this.viewer.currentPage = newPage;
            this.viewer.pageInput.value = this.viewer.currentPage;
            
            // PDFが読み込まれている場合はレンダリング、そうでなければデモ表示更新
            if (this.viewer.pdfLoader && this.viewer.pdfLoader.pdf) {
                this.viewer.pdfLoader.debouncedRenderPage(newPage);
            } else {
                this.viewer.showDemoContent();
            }
            
            this.updateControls();
            this.viewer.fullscreenManager.updateFullscreenControls();
            
            // ページ移動時に隣接ページをプリロード（遅延実行）
            setTimeout(() => {
                if (this.viewer.pdfLoader) {
                    this.viewer.pdfLoader.preloadAdjacentPages();
                }
            }, 100);
        }
    }

    nextPage() {
        this.goToPage(this.viewer.currentPage + 1);
    }

    prevPage() {
        this.goToPage(this.viewer.currentPage - 1);
    }

    firstPage() {
        this.goToPage(1);
    }

    lastPage() {
        this.goToPage(this.viewer.totalPages || 57);
    }

    updateControls() {
        const isFirstPage = this.viewer.currentPage === 1;
        const isLastPage = this.viewer.currentPage === (this.viewer.totalPages || 57);

        document.getElementById('firstPageBtn').disabled = isFirstPage;
        document.getElementById('prevPageBtn').disabled = isFirstPage;
        document.getElementById('nextPageBtn').disabled = isLastPage;
        document.getElementById('lastPageBtn').disabled = isLastPage;

        this.viewer.pageInput.max = this.viewer.totalPages || 57;
    }

    initializeEventListeners() {
        // ページ移動ボタン
        document.getElementById('firstPageBtn').addEventListener('click', () => this.firstPage());
        document.getElementById('prevPageBtn').addEventListener('click', () => this.prevPage());
        document.getElementById('nextPageBtn').addEventListener('click', () => this.nextPage());
        document.getElementById('lastPageBtn').addEventListener('click', () => this.lastPage());

        // ページ入力
        this.viewer.pageInput.addEventListener('change', (e) => {
            const pageNumber = parseInt(e.target.value);
            if (!isNaN(pageNumber)) {
                this.goToPage(pageNumber);
            }
        });

        this.viewer.pageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const pageNumber = parseInt(e.target.value);
                if (!isNaN(pageNumber)) {
                    this.goToPage(pageNumber);
                }
            }
        });

        // 目次リンク処理は main.js で統一管理されるため、ここでは削除
        // main.js の initializeEventListeners() で処理される

        // キーボードショートカット
        document.addEventListener('keydown', (e) => {
            // 入力フィールドにフォーカスがある場合は無視
            if (e.target.tagName === 'INPUT') return;

            switch (e.key) {
                case 'ArrowLeft':
                case 'ArrowUp':
                case 'PageUp':
                    e.preventDefault();
                    this.prevPage();
                    break;
                case 'ArrowRight':
                case 'ArrowDown':
                case 'PageDown':
                case ' ': // スペースキー
                    e.preventDefault();
                    this.nextPage();
                    break;
                case 'Home':
                    e.preventDefault();
                    this.firstPage();
                    break;
                case 'End':
                    e.preventDefault();
                    this.lastPage();
                    break;
                case 'Escape':
                    if (this.viewer.fullscreenManager.isFullscreen) {
                        e.preventDefault();
                        this.viewer.fullscreenManager.exitFullscreen();
                    }
                    break;
            }
        });
    }
}
