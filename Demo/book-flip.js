/**
 * リファクタリング版 SVG Book Flip Demo
 * エラーハンドリング、アクセシビリティ、設定ベース実装
 */

class BookFlipDemo {
    constructor(config = {}) {
        // 設定のマージ
        this.config = {
            totalPages: 30,
            svgPath: './SVG/',
            filePattern: 'page-{number:04d}.svg',
            animationDuration: 1200,
            ...config
        };

        // DOM要素の取得とバリデーション
        this.initializeElements();
        
        // 状態管理
        this.currentPageIndex = 0;
        this.isAnimating = false;
        
        // 初期化
        this.initialize();
    }

    initializeElements() {
        try {
            this.book = document.querySelector('.book');
            this.pages = document.querySelectorAll('.page');
            this.staticLeftPage = document.querySelector('.static-left-page .page-content');
            this.tocToggle = document.getElementById('tocToggle');
            this.toc = document.getElementById('toc');
            this.tocCloseBtn = document.getElementById('tocCloseBtn');

            if (!this.book || !this.pages.length || !this.staticLeftPage) {
                throw new Error('必要なDOM要素が見つかりません');
            }

            this.totalPages = this.pages.length;
        } catch (error) {
            console.error('DOM要素の初期化に失敗:', error);
            this.showError('アプリケーションの初期化に失敗しました。');
        }
    }

    initialize() {
        try {
            this.initializePagesZIndex();
            this.bindEvents();
            this.initializeTOC();
            this.updateStaticLeftPage();
            this.updateTOCActive();
            
            // アクセシビリティ属性の設定
            this.setupAccessibility();
            
            console.log('BookFlipDemo initialized successfully');
        } catch (error) {
            console.error('初期化エラー:', error);
            this.showError('初期化中にエラーが発生しました。');
        }
    }

    initializePagesZIndex() {
        this.pages.forEach((page, index) => {
            try {
                page.style.zIndex = this.totalPages - index;
                page.setAttribute('data-page-index', index);
            } catch (error) {
                console.warn(`ページ ${index} のz-index設定に失敗:`, error);
            }
        });
    }

    bindEvents() {
        // クリックイベント
        if (this.book) {
            this.book.addEventListener('click', this.handleBookClick.bind(this));
        }

        // キーボードイベント（アクセシビリティ強化）
        document.addEventListener('keydown', this.handleKeydown.bind(this));

        // 目次イベント
        if (this.tocToggle) {
            this.tocToggle.addEventListener('click', this.toggleTOC.bind(this));
        }
        if (this.tocCloseBtn) {
            this.tocCloseBtn.addEventListener('click', this.closeTOC.bind(this));
        }

        // リサイズイベント
        window.addEventListener('resize', this.debounce(this.handleResize.bind(this), 250));
    }

    handleBookClick(e) {
        if (this.isAnimating) return;

        try {
            const bookRect = this.book.getBoundingClientRect();
            const clickX = e.clientX - bookRect.left;
            const isRightHalf = clickX > bookRect.width / 2;

            if (isRightHalf) {
                this.nextPage();
            } else {
                this.prevPage();
            }
        } catch (error) {
            console.error('クリックイベント処理エラー:', error);
        }
    }

    handleKeydown(e) {
        // 入力フィールドにフォーカスがある場合は無視
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

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
            case ' ':
                e.preventDefault();
                this.nextPage();
                break;
            case 'Home':
                e.preventDefault();
                this.goToPage(0);
                break;
            case 'End':
                e.preventDefault();
                this.goToPage(this.totalPages);
                break;
            case 'Escape':
                this.closeTOC();
                break;
            case '?':
                e.preventDefault();
                this.showKeyboardHelp();
                break;
        }
    }

    nextPage() {
        if (this.isAnimating || this.currentPageIndex >= this.totalPages) return;
        
        try {
            this.isAnimating = true;
            const pageToFlip = this.pages[this.currentPageIndex];
            
            if (pageToFlip) {
                pageToFlip.classList.add('flipped');
                pageToFlip.style.zIndex = this.currentPageIndex;
                this.currentPageIndex++;
                
                this.updateStaticLeftPage();
                this.updateTOCActive();
                
                // アニメーション完了を待つ
                setTimeout(() => {
                    this.isAnimating = false;
                }, this.config.animationDuration);
            }
        } catch (error) {
            console.error('次ページ移動エラー:', error);
            this.isAnimating = false;
        }
    }

    prevPage() {
        if (this.isAnimating || this.currentPageIndex <= 0) return;
        
        try {
            this.isAnimating = true;
            this.currentPageIndex--;
            const pageToUnflip = this.pages[this.currentPageIndex];
            
            if (pageToUnflip) {
                pageToUnflip.classList.remove('flipped');
                pageToUnflip.style.zIndex = this.totalPages - this.currentPageIndex;
                
                this.updateStaticLeftPage();
                this.updateTOCActive();
                
                // アニメーション完了を待つ
                setTimeout(() => {
                    this.isAnimating = false;
                }, this.config.animationDuration);
            }
        } catch (error) {
            console.error('前ページ移動エラー:', error);
            this.isAnimating = false;
        }
    }

    goToPage(pageIndex) {
        if (this.isAnimating || pageIndex < 0 || pageIndex > this.totalPages) return;
        
        try {
            while (this.currentPageIndex < pageIndex) {
                this.nextPage();
            }
            while (this.currentPageIndex > pageIndex) {
                this.prevPage();
            }
        } catch (error) {
            console.error('ページ移動エラー:', error);
        }
    }

    updateStaticLeftPage() {
        if (!this.staticLeftPage) return;
        
        try {
            if (this.currentPageIndex > 0) {
                const page = this.pages[this.currentPageIndex - 1];
                const content = page?.querySelector('.front .page-content');
                
                if (content && content.style.backgroundImage) {
                    this.staticLeftPage.style.backgroundImage = content.style.backgroundImage;
                } else {
                    this.staticLeftPage.style.backgroundImage = 'none';
                }
            } else {
                this.staticLeftPage.style.backgroundImage = 'none';
            }
        } catch (error) {
            console.error('静的左ページ更新エラー:', error);
            // フォールバック
            if (this.staticLeftPage) {
                this.staticLeftPage.style.backgroundImage = 'none';
            }
        }
    }

    initializeTOC() {
        const tocList = document.getElementById('tocList');
        if (!tocList) return;

        try {
            // TOC項目を動的生成
            for (let i = 0; i < this.totalPages; i++) {
                const li = document.createElement('li');
                li.textContent = `ページ ${i + 1}`;
                li.setAttribute('data-page', i);
                li.setAttribute('role', 'button');
                li.setAttribute('tabindex', '0');
                li.addEventListener('click', () => this.goToPage(i));
                li.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        this.goToPage(i);
                    }
                });
                tocList.appendChild(li);
            }
        } catch (error) {
            console.error('TOC初期化エラー:', error);
        }
    }

    updateTOCActive() {
        try {
            const tocItems = document.querySelectorAll('#tocList li');
            tocItems.forEach((item, index) => {
                item.classList.toggle('active', index === this.currentPageIndex);
            });
        } catch (error) {
            console.error('TOCアクティブ更新エラー:', error);
        }
    }

    toggleTOC() {
        if (!this.toc) return;
        this.toc.classList.toggle('open');
    }

    closeTOC() {
        if (!this.toc) return;
        this.toc.classList.remove('open');
    }

    setupAccessibility() {
        try {
            // ブック要素にARIA属性を追加
            if (this.book) {
                this.book.setAttribute('role', 'application');
                this.book.setAttribute('aria-label', 'インタラクティブな書籍ビューア');
                this.book.setAttribute('tabindex', '0');
            }

            // ページにARIA属性を追加
            this.pages.forEach((page, index) => {
                page.setAttribute('aria-label', `ページ ${index + 1}`);
            });
        } catch (error) {
            console.error('アクセシビリティ設定エラー:', error);
        }
    }

    showKeyboardHelp() {
        const helpText = `
キーボードショートカット:
- ← / ↑ / PageUp: 前のページ
- → / ↓ / PageDown / Space: 次のページ  
- Home: 最初のページ
- End: 最後のページ
- Escape: メニューを閉じる
- ?: このヘルプを表示
        `;
        alert(helpText);
    }

    handleResize() {
        // リサイズ時の処理（必要に応じて実装）
        console.log('ウィンドウがリサイズされました');
    }

    showError(message) {
        console.error(message);
        // ユーザーフレンドリーなエラー表示
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed; top: 20px; right: 20px; 
            background: #ff4444; color: white; 
            padding: 10px 20px; border-radius: 5px; 
            z-index: 9999; font-size: 14px;
        `;
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 5000);
    }

    // ユーティリティメソッド
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    try {
        new BookFlipDemo({
            totalPages: 30,
            svgPath: './SVG/',
            animationDuration: 1200
        });
    } catch (error) {
        console.error('BookFlipDemo初期化失敗:', error);
    }
});
