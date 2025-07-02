/**
 * モバイルメニュー機能
 */
class MobileMenu {
    constructor(viewer) {
        this.viewer = viewer;
        this.initializeEventListeners();
    }

    toggleMobileMenu() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('overlay');

        sidebar.classList.toggle('open');
        overlay.classList.toggle('active');

        // アクセシビリティ
        const isOpen = sidebar.classList.contains('open');
        document.getElementById('menuToggle').setAttribute('aria-expanded', isOpen);
    }

    closeMobileMenu() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('overlay');

        sidebar.classList.remove('open');
        overlay.classList.remove('active');

        document.getElementById('menuToggle').setAttribute('aria-expanded', 'false');
    }

    initializeEventListeners() {
        const menuToggle = document.getElementById('menuToggle');
        const overlay = document.getElementById('overlay');

        menuToggle.addEventListener('click', () => {
            this.toggleMobileMenu();
        });

        overlay.addEventListener('click', () => {
            this.closeMobileMenu();
        });

        // ESCキーでメニューを閉じる
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeMobileMenu();
            }
        });
    }
}
