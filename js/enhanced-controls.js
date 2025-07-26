/**
 * 改善版コントロールバー - インタラクション & アクセシビリティ機能
 * ホバーコントローラー改善案の実装
 */

class EnhancedControls {
    constructor(viewer) {
        this.viewer = viewer;
        
        // レスポンシブブレークポイント
        this.breakpoints = {
            mobile: 767,
            tablet: 1023,
            desktop: 1439
        };
        
        // デバイス検出
        this.deviceType = this.detectDeviceType();
        this.isTouchDevice = this.detectTouchDevice();
        
        this.init();
    }
    
    detectDeviceType() {
        const width = window.innerWidth;
        if (width <= this.breakpoints.mobile) return 'mobile';
        if (width <= this.breakpoints.tablet) return 'tablet';
        if (width <= this.breakpoints.desktop) return 'desktop';
        return 'large-desktop';
    }
    
    detectTouchDevice() {
        return ('ontouchstart' in window) || 
               (navigator.maxTouchPoints > 0) || 
               (navigator.msMaxTouchPoints > 0);
    }

    init() {
        this.bindEvents();
        this.setupAccessibility();
        this.initializeTooltips();
    }

    bindEvents() {
        // 強化されたボタンのイベント
        this.bindEnhancedButtons();
        
        // モバイルコントロールの処理
        this.bindMobileControls();
        
        // ページ入力の処理
        this.bindPageInput();
        
        // リサイズ対応
        this.bindResizeHandler();
    }

    bindEnhancedButtons() {
        const enhancedBtns = document.querySelectorAll('.enhanced-btn');
        
        enhancedBtns.forEach(btn => {
            const action = btn.dataset.action;
            
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleControlAction(action, btn);
                this.addClickEffect(btn);
            });
            
            btn.addEventListener('mouseenter', () => {
                this.showTooltip(btn);
            });
            
            btn.addEventListener('mouseleave', () => {
                this.hideTooltip();
            });
            
            // キーボード操作対応
            btn.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.handleControlAction(action, btn);
                    this.addClickEffect(btn);
                }
            });
        });
    }


    bindMobileControls() {
        const mobileBtns = document.querySelectorAll('.mobile-btn');
        
        mobileBtns.forEach(btn => {
            const action = btn.dataset.action;
            
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log(`Mobile button clicked: action=${action}`);
                this.handleMobileAction(action, btn);
                this.addMobileClickEffect(btn);
            });
            
            // タッチフィードバック
            btn.addEventListener('touchstart', () => {
                btn.style.transform = 'scale(0.95)';
            });
            
            btn.addEventListener('touchend', () => {
                setTimeout(() => {
                    btn.style.transform = '';
                }, 150);
            });
        });
    }

    bindPageInput() {
        const pageInput = document.getElementById('pageInput');
        if (pageInput) {
            pageInput.addEventListener('change', (e) => {
                const newPage = parseInt(e.target.value);
                if (newPage >= 1 && newPage <= this.viewer.totalPages) {
                    this.viewer.goToPage(newPage);
                    this.announceToScreenReader(`ページ ${newPage} に移動しました`);
                }
            });

            pageInput.addEventListener('focus', () => {
                pageInput.select();
            });

            pageInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    const newPage = parseInt(e.target.value);
                    if (newPage >= 1 && newPage <= this.viewer.totalPages) {
                        this.viewer.goToPage(newPage);
                        this.announceToScreenReader(`ページ ${newPage} に移動しました`);
                    }
                }
            });
        }
    }

    bindResizeHandler() {
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                this.handleResize();
            }, 250);
        });
    }

    handleControlAction(action, button) {
        switch (action) {
            case 'first':
                // EventManagerに委譲 - 重複実行を防ぐ
                console.log('Enhanced-controls: first page action delegated to EventManager');
                break;
            case 'prev':
                // EventManagerに委譲 - 重複実行を防ぐ
                console.log('Enhanced-controls: prev page action delegated to EventManager');
                break;
            case 'next':
                // EventManagerに委譲 - 重複実行を防ぐ
                console.log('Enhanced-controls: next page action delegated to EventManager');
                break;
            case 'last':
                // EventManagerに委譲 - 重複実行を防ぐ
                console.log('Enhanced-controls: last page action delegated to EventManager');
                break;
            case 'zoom-in':
                this.viewer.zoomIn();
                break;
            case 'zoom-out':
                this.viewer.zoomOut();
                break;
            case 'split':
                this.viewer.toggleSplitMode();
                break;
            case 'fullscreen':
                this.viewer.toggleFullscreen();
                break;
        }
        
        // ボタンの状態更新
        this.updateButtonStates();
    }

    handleMobileAction(action, button) {
        switch (action) {
            case 'prev':
                // モバイル版では直接実行（重複がないため）
                console.log('Enhanced-controls mobile: executing prev page');
                this.viewer.prevPage();
                break;
            case 'next':
                // モバイル版では直接実行（重複がないため）
                console.log('Enhanced-controls mobile: executing next page');
                this.viewer.nextPage();
                break;
            case 'split-side-toggle':
                // 分割表示の左右切り替え
                if (this.viewer.svgViewer && this.viewer.svgViewer.splitMode) {
                    this.viewer.toggleSplitSide();
                } else {
                    // 分割モードでない場合は分割モードを開始
                    this.viewer.toggleSplitMode();
                }
                break;
            case 'split':
                this.viewer.toggleSplitMode();
                break;
            case 'fullscreen':
                this.viewer.toggleFullscreen();
                break;
        }
        
        this.updateMobileDisplay();
        this.updateButtonStates();
    }


    handleResize() {
        const previousDeviceType = this.deviceType;
        const previousTouchDevice = this.isTouchDevice;
        
        // デバイスタイプを再検出
        this.deviceType = this.detectDeviceType();
        this.isTouchDevice = this.detectTouchDevice();
        
        // デバイスタイプが変更された場合の処理
        if (previousDeviceType !== this.deviceType) {
            console.log(`Device type changed: ${previousDeviceType} → ${this.deviceType}`);
            
            // UIの状態をリセット
            this.resetUIState();
            
            // デバイス固有の初期化
            this.initializeForDevice();
            
            // 表示の更新
            this.updateDisplayForDevice();
        }
        
        // タッチデバイス状態が変更された場合
        if (previousTouchDevice !== this.isTouchDevice) {
            this.updateTouchOptimizations();
        }
    }
    
    resetUIState() {
        // ツールチップを非表示
        this.hideTooltip();
    }
    
    initializeForDevice() {
        switch (this.deviceType) {
            case 'mobile':
                this.initializeMobileControls();
                break;
            case 'tablet':
                this.initializeTabletControls();
                break;
            case 'desktop':
            case 'large-desktop':
                this.initializeDesktopControls();
                break;
        }
    }
    
    initializeMobileControls() {
        // モバイル専用の初期化
        console.log('Initializing mobile controls');
        this.updateMobileDisplay();
    }
    
    initializeTabletControls() {
        // タブレット専用の初期化
        console.log('Initializing tablet controls');
    }
    
    initializeDesktopControls() {
        // デスクトップ専用の初期化
        console.log('Initializing desktop controls');
    }
    
    updateDisplayForDevice() {
        // デバイス別の表示更新
        if (this.deviceType === 'mobile') {
            this.updateMobileDisplay();
        }
        
        // ボタン状態の更新
        this.updateButtonStates();
    }
    
    updateTouchOptimizations() {
        // タッチデバイス向けの最適化
        const controls = document.getElementById('controls');
        if (controls) {
            if (this.isTouchDevice) {
                controls.classList.add('touch-optimized');
            } else {
                controls.classList.remove('touch-optimized');
            }
        }
    }

    updateButtonStates() {
        const isFirstPage = this.viewer.currentPage === 1;
        const isLastPage = this.viewer.currentPage === this.viewer.totalPages;
        
        // デスクトップボタンの状態更新
        const firstBtns = document.querySelectorAll('[data-action="first"], [data-action="prev"]');
        const lastBtns = document.querySelectorAll('[data-action="last"], [data-action="next"]');
        
        firstBtns.forEach(btn => {
            btn.disabled = isFirstPage;
            btn.style.opacity = isFirstPage ? '0.5' : '1';
            btn.setAttribute('aria-disabled', isFirstPage.toString());
        });
        
        lastBtns.forEach(btn => {
            btn.disabled = isLastPage;
            btn.style.opacity = isLastPage ? '0.5' : '1';
            btn.setAttribute('aria-disabled', isLastPage.toString());
        });
        
        // モバイルボタンの状態更新
        const mobilePrevBtns = document.querySelectorAll('.mobile-btn[data-action="prev"]');
        const mobileNextBtns = document.querySelectorAll('.mobile-btn[data-action="next"]');
        
        mobilePrevBtns.forEach(btn => {
            btn.disabled = isFirstPage;
            btn.style.opacity = isFirstPage ? '0.5' : '1';
        });
        
        mobileNextBtns.forEach(btn => {
            btn.disabled = isLastPage;
            btn.style.opacity = isLastPage ? '0.5' : '1';
        });
    }

    updateMobileDisplay() {
        const mobileCurrentPage = document.getElementById('mobileCurrentPage');
        const mobileTotalPages = document.getElementById('mobileTotalPages');
        
        if (mobileCurrentPage) {
            mobileCurrentPage.textContent = this.viewer.currentPage;
        }
        
        if (mobileTotalPages) {
            mobileTotalPages.textContent = this.viewer.totalPages;
        }
        
        // 分割表示ボタンのアイコンと状態を更新
        this.updateMobileSplitButton();
    }
    
    updateMobileSplitButton() {
        const splitToggleBtn = document.querySelector('.mobile-btn[data-action="split-side-toggle"]');
        const splitIcon = splitToggleBtn?.querySelector('.mobile-icon');
        
        if (!splitToggleBtn || !splitIcon) return;
        
        if (this.viewer.svgViewer && this.viewer.svgViewer.splitMode) {
            // 分割モード中：左右切り替え表示
            const currentSide = this.viewer.svgViewer.splitSide || 'left';
            splitIcon.textContent = currentSide === 'left' ? '◐' : '◑';
            splitToggleBtn.setAttribute('aria-label', 
                currentSide === 'left' ? '右側表示に切り替え' : '左側表示に切り替え');
            splitToggleBtn.classList.add('active');
        } else {
            // 通常モード：分割開始表示
            splitIcon.textContent = '⇄';
            splitToggleBtn.setAttribute('aria-label', '分割表示開始');
            splitToggleBtn.classList.remove('active');
        }
    }

    // インタラクティブエフェクト
    createRippleEffect(element, type = 'click') {
        const ripple = document.createElement('span');
        const rect = element.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = '50%';
        ripple.style.top = '50%';
        ripple.style.transform = 'translate(-50%, -50%) scale(0)';
        ripple.style.position = 'absolute';
        ripple.style.borderRadius = '50%';
        ripple.style.backgroundColor = type === 'hover' ? 
            'rgba(26, 115, 232, 0.1)' : 'rgba(26, 115, 232, 0.3)';
        ripple.style.pointerEvents = 'none';
        ripple.style.transition = 'transform 0.6s ease-out, opacity 0.6s ease-out';
        
        element.style.position = 'relative';
        element.style.overflow = 'hidden';
        element.appendChild(ripple);
        
        requestAnimationFrame(() => {
            ripple.style.transform = 'translate(-50%, -50%) scale(1)';
            ripple.style.opacity = type === 'hover' ? '1' : '0';
        });
        
        setTimeout(() => {
            if (ripple.parentNode) {
                ripple.parentNode.removeChild(ripple);
            }
        }, 600);
    }

    addClickEffect(button) {
        // シンプルなクリック効果
        button.style.transform = 'translateY(-2px) scale(0.98)';
        setTimeout(() => {
            button.style.transform = '';
        }, 150);
    }

    addMobileClickEffect(button) {
        button.style.transform = 'scale(0.9)';
        button.style.backgroundColor = '#1557b0';
        
        setTimeout(() => {
            button.style.transform = '';
            button.style.backgroundColor = '';
        }, 200);
        
        // 触覚フィードバック
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
    }

    // ツールチップ機能
    initializeTooltips() {
        this.tooltipElement = null;
    }

    showTooltip(button) {
        if (this.isMobile) return; // モバイルではツールチップを表示しない
        
        this.hideTooltip();

        const tooltip = document.createElement('div');
        tooltip.className = 'enhanced-tooltip';
        tooltip.textContent = button.getAttribute('aria-label') || 
                             button.getAttribute('title') ||
                             button.querySelector('.btn-label')?.textContent || 
                             'ボタン';
        
        tooltip.style.cssText = `
            position: absolute;
            background: rgba(32, 33, 36, 0.9);
            color: white;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 500;
            white-space: nowrap;
            z-index: 1001;
            pointer-events: none;
            backdrop-filter: blur(8px);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
            transform: translateY(-100%);
            margin-top: -8px;
            opacity: 0;
            transition: opacity 0.2s ease-out, transform 0.2s ease-out;
        `;
        
        document.body.appendChild(tooltip);
        this.tooltipElement = tooltip;
        
        const buttonRect = button.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        
        tooltip.style.left = `${buttonRect.left + buttonRect.width / 2 - tooltipRect.width / 2}px`;
        tooltip.style.top = `${buttonRect.top}px`;
        
        requestAnimationFrame(() => {
            tooltip.style.opacity = '1';
            tooltip.style.transform = 'translateY(-100%) translateY(-4px)';
        });
    }

    hideTooltip() {
        if (this.tooltipElement) {
            this.tooltipElement.style.opacity = '0';
            this.tooltipElement.style.transform = 'translateY(-100%)';
            setTimeout(() => {
                if (this.tooltipElement && this.tooltipElement.parentNode) {
                    this.tooltipElement.parentNode.removeChild(this.tooltipElement);
                }
                this.tooltipElement = null;
            }, 200);
        }
    }

    showToast(message) {
        const existingToast = document.querySelector('.enhanced-toast');
        if (existingToast) {
            existingToast.remove();
        }

        const toast = document.createElement('div');
        toast.className = 'enhanced-toast';
        toast.textContent = message;
        
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(26, 115, 232, 0.95);
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            z-index: 1002;
            backdrop-filter: blur(8px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            transform: translateX(100%);
            transition: transform 0.3s cubic-bezier(0.2, 0, 0, 1);
        `;
        
        document.body.appendChild(toast);
        
        requestAnimationFrame(() => {
            toast.style.transform = 'translateX(0)';
        });
        
        setTimeout(() => {
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }

    // アクセシビリティ機能
    setupAccessibility() {
        this.setupLiveRegions();
        this.setupKeyboardNavigation();
        this.updateAriaAttributes();
    }

    setupLiveRegions() {
        if (!document.getElementById('sr-live-region')) {
            const liveRegion = document.createElement('div');
            liveRegion.id = 'sr-live-region';
            liveRegion.setAttribute('aria-live', 'polite');
            liveRegion.setAttribute('aria-atomic', 'true');
            liveRegion.className = 'sr-only';
            document.body.appendChild(liveRegion);
        }
    }

    setupKeyboardNavigation() {
        // キーボードナビゲーションはEventManagerに一元化
        // 重複実行を防ぐため、Enhanced-controlsでは無効化
        console.log('Enhanced-controls: キーボードナビゲーションはEventManagerに委譲');
        /*
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT') return;
            
            switch (e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    this.viewer.prevPage();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.viewer.nextPage();
                    break;
                case 'Home':
                    e.preventDefault();
                    this.viewer.firstPage();
                    break;
                case 'End':
                    e.preventDefault();
                    this.viewer.lastPage();
                    break;
                case '+':
                case '=':
                    e.preventDefault();
                    this.viewer.zoomIn();
                    break;
                case '-':
                    e.preventDefault();
                    this.viewer.zoomOut();
                    break;
                case 's':
                case 'S':
                    e.preventDefault();
                    this.viewer.toggleSplitMode();
                    break;
                case 'F11':
                    e.preventDefault();
                    this.viewer.toggleFullscreen();
                    break;
            }
        });
        */
    }

    updateAriaAttributes() {
        const pageInput = document.getElementById('pageInput');
        if (pageInput) {
            pageInput.setAttribute('aria-valuemin', '1');
            pageInput.setAttribute('aria-valuemax', this.viewer.totalPages.toString());
            pageInput.setAttribute('aria-valuenow', this.viewer.currentPage.toString());
        }
    }

    announceToScreenReader(message) {
        const liveRegion = document.getElementById('sr-live-region');
        if (liveRegion) {
            liveRegion.textContent = message;
        }
    }

    // クリーンアップ
    destroy() {
        this.hideTooltip();
        
        const toast = document.querySelector('.enhanced-toast');
        if (toast && toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
        
        // イベントリスナーの削除は既存のEventManagerが処理
    }
}

// 既存のISCPDFViewerに統合
if (typeof window !== 'undefined') {
    window.EnhancedControls = EnhancedControls;
}