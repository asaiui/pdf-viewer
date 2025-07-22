/**
 * 強化されたモバイルメニュー機能
 * - スワイプジェスチャー対応
 * - アニメーション強化
 * - タッチデバイス検出
 * - フォーカストラップ
 */
class MobileMenu {
    constructor(viewer) {
        this.viewer = viewer;
        this.isOpen = false;
        this.startX = 0;
        this.currentX = 0;
        this.isDragging = false;
        this.threshold = 50; // スワイプ閾値
        this.isTouch = this.detectTouchDevice();

        this.initializeEventListeners();
        this.initializeSwipeGestures();
        this.initializeFocusTrap();
    }

    toggleMobileMenu() {
        if (this.isOpen) {
            this.closeMobileMenu();
        } else {
            this.openMobileMenu();
        }
    }

    openMobileMenu() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('overlay');
        const menuToggle = document.getElementById('menuToggle');

        this.isOpen = true;
        sidebar.classList.add('open');
        overlay.classList.add('active');

        // ハンバーガーアイコンアニメーション
        this.animateHamburger(true);

        // アクセシビリティ強化
        menuToggle.setAttribute('aria-expanded', 'true');
        menuToggle.setAttribute('aria-label', 'メニューを閉じる');
        sidebar.setAttribute('aria-hidden', 'false');
        overlay.setAttribute('aria-hidden', 'false');

        // ボディのスクロールを無効化
        document.body.style.overflow = 'hidden';

        // フォーカスをサイドバーの最初の要素に移動
        this.trapFocus(sidebar);

        // アニメーション完了後のコールバック
        setTimeout(() => {
            const firstFocusable = sidebar.querySelector('a, button, [tabindex="0"]');
            if (firstFocusable) firstFocusable.focus();
        }, 300);
    }

    closeMobileMenu() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('overlay');
        const menuToggle = document.getElementById('menuToggle');

        this.isOpen = false;
        sidebar.classList.remove('open');
        overlay.classList.remove('active');

        // ハンバーガーアイコンアニメーション
        this.animateHamburger(false);

        // アクセシビリティ復元
        menuToggle.setAttribute('aria-expanded', 'false');
        menuToggle.setAttribute('aria-label', 'メニューを開く');
        sidebar.setAttribute('aria-hidden', 'true');
        overlay.setAttribute('aria-hidden', 'true');

        // ボディのスクロールを復元
        document.body.style.overflow = '';

        // フォーカスをメニューボタンに戻す
        menuToggle.focus();

        // フォーカストラップを解除
        this.releaseFocusTrap();
    }

    initializeEventListeners() {
        const menuToggle = document.getElementById('menuToggle');
        const overlay = document.getElementById('overlay');
        const sidebar = document.getElementById('sidebar');

        // メニュートグルボタン
        menuToggle.addEventListener('click', (e) => {
            e.preventDefault();
            this.toggleMobileMenu();
        });

        // オーバーレイクリック
        overlay.addEventListener('click', () => {
            this.closeMobileMenu();
        });

        // サイドバー外クリック（バブリング防止）
        sidebar.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // キーボードイベント
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.closeMobileMenu();
            }
        });

        // 画面サイズ変更時の対応
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768 && this.isOpen) {
                this.closeMobileMenu();
            }
        });

        // デバイス向き変更時の対応
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                if (this.isOpen) {
                    this.adjustSidebarPosition();
                }
            }, 100);
        });
    }

    // タッチデバイス検出
    detectTouchDevice() {
        return ('ontouchstart' in window) ||
            (navigator.maxTouchPoints > 0) ||
            (navigator.msMaxTouchPoints > 0);
    }

    // スワイプジェスチャー初期化
    initializeSwipeGestures() {
        if (!this.isTouch) return;

        const sidebar = document.getElementById('sidebar');

        // タッチイベントリスナー
        document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
        document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });
    }

    handleTouchStart(e) {
        this.startX = e.touches[0].clientX;
        this.isDragging = false;
    }

    handleTouchMove(e) {
        if (!this.startX) return;

        this.currentX = e.touches[0].clientX;
        const diffX = this.startX - this.currentX;

        // 左スワイプでメニューを閉じる（メニューが開いている時）
        if (this.isOpen && diffX > 10) {
            this.isDragging = true;
            e.preventDefault(); // スクロールを防ぐ
        }

        // 右スワイプでメニューを開く（画面左端から）
        if (!this.isOpen && this.startX < 20 && diffX < -10) {
            this.isDragging = true;
            e.preventDefault();
        }
    }

    handleTouchEnd(e) {
        if (!this.isDragging) return;

        const diffX = this.startX - this.currentX;

        // スワイプ距離が閾値を超えた場合
        if (Math.abs(diffX) > this.threshold) {
            if (this.isOpen && diffX > 0) {
                this.closeMobileMenu();
            } else if (!this.isOpen && diffX < 0) {
                this.openMobileMenu();
            }
        }

        this.startX = 0;
        this.currentX = 0;
        this.isDragging = false;
    }

    // フォーカストラップ初期化
    initializeFocusTrap() {
        this.focusableElements = [];
        this.firstFocusable = null;
        this.lastFocusable = null;
    }

    // フォーカストラップ適用
    trapFocus(container) {
        this.focusableElements = container.querySelectorAll(
            'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select, [tabindex="0"]'
        );

        if (this.focusableElements.length === 0) return;

        this.firstFocusable = this.focusableElements[0];
        this.lastFocusable = this.focusableElements[this.focusableElements.length - 1];

        // Tab循環の設定
        document.addEventListener('keydown', this.handleFocusTrap.bind(this));
    }

    handleFocusTrap(e) {
        if (!this.isOpen || e.key !== 'Tab') return;

        if (e.shiftKey) {
            if (document.activeElement === this.firstFocusable) {
                e.preventDefault();
                this.lastFocusable.focus();
            }
        } else {
            if (document.activeElement === this.lastFocusable) {
                e.preventDefault();
                this.firstFocusable.focus();
            }
        }
    }

    // フォーカストラップ解除
    releaseFocusTrap() {
        document.removeEventListener('keydown', this.handleFocusTrap.bind(this));
    }

    // サイドバー位置調整
    adjustSidebarPosition() {
        const sidebar = document.getElementById('sidebar');
        if (window.innerHeight < 500) {
            sidebar.style.height = 'calc(100vh - 50px)';
        } else {
            sidebar.style.height = '';
        }
    }

    // ハンバーガーアイコンアニメーション
    animateHamburger(isOpen) {
        const lines = document.querySelectorAll('.hamburger-line');
        if (isOpen) {
            lines[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
            lines[1].style.opacity = '0';
            lines[2].style.transform = 'rotate(-45deg) translate(7px, -6px)';
        } else {
            lines.forEach(line => {
                line.style.transform = '';
                line.style.opacity = '';
            });
        }
    }

    // クリーンアップ
    destroy() {
        document.removeEventListener('touchstart', this.handleTouchStart.bind(this));
        document.removeEventListener('touchmove', this.handleTouchMove.bind(this));
        document.removeEventListener('touchend', this.handleTouchEnd.bind(this));
        this.releaseFocusTrap();
    }
}