/**
 * ホバーコントローラー改善案 - インタラクションデモ
 * 提案されたUIコンポーネントの動作をデモンストレーション
 */

class HoverControlsDemo {
    constructor() {
        this.currentPage = 1;
        this.totalPages = 30;
        this.zoomLevel = 100;
        this.isSecondaryExpanded = false;
        this.isMobileSecondaryVisible = false;
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.updateDisplay();
        this.initializeAccessibility();
        this.setupKeyboardNavigation();
    }

    bindEvents() {
        // 改善案コントローラーのイベント
        this.bindEnhancedControlEvents();
        
        // モバイルコントローラーのイベント
        this.bindMobileControlEvents();
        
        // セカンダリコントロールの展開/折りたたみ
        this.bindSecondaryToggle();
        
        // デモ用インタラクション
        this.addInteractiveEffects();
    }

    bindEnhancedControlEvents() {
        const enhancedBtns = document.querySelectorAll('.enhanced-btn');
        
        enhancedBtns.forEach(btn => {
            const action = btn.dataset.action;
            
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleControlAction(action);
                this.addClickEffect(btn);
            });
            
            btn.addEventListener('mouseenter', () => {
                this.showTooltip(btn);
            });
            
            btn.addEventListener('mouseleave', () => {
                this.hideTooltip();
            });
        });

        // ページ入力の処理
        const pageInput = document.querySelector('.page-input-enhanced');
        if (pageInput) {
            pageInput.addEventListener('change', (e) => {
                const newPage = parseInt(e.target.value);
                if (newPage >= 1 && newPage <= this.totalPages) {
                    this.currentPage = newPage;
                    this.updateDisplay();
                }
            });

            pageInput.addEventListener('focus', () => {
                pageInput.select();
            });
        }
    }

    bindMobileControlEvents() {
        const mobileBtns = document.querySelectorAll('.mobile-btn');
        
        mobileBtns.forEach(btn => {
            const action = btn.dataset.action;
            
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleMobileAction(action);
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

    bindSecondaryToggle() {
        const toggleBtn = document.querySelector('.toggle-secondary');
        const expandableControls = document.querySelector('.expandable-controls');
        
        if (toggleBtn && expandableControls) {
            toggleBtn.addEventListener('click', () => {
                this.isSecondaryExpanded = !this.isSecondaryExpanded;
                
                if (this.isSecondaryExpanded) {
                    expandableControls.classList.remove('hidden');
                    toggleBtn.innerHTML = `
                        <span class="toggle-icon">⚙️</span>
                        <span class="toggle-label">閉じる</span>
                    `;
                } else {
                    expandableControls.classList.add('hidden');
                    toggleBtn.innerHTML = `
                        <span class="toggle-icon">⚙️</span>
                        <span class="toggle-label">詳細</span>
                    `;
                }
                
                this.announceToScreenReader(
                    this.isSecondaryExpanded ? '詳細コントロールを表示しました' : '詳細コントロールを非表示にしました'
                );
            });
        }
    }

    handleControlAction(action) {
        switch (action) {
            case 'first':
                this.currentPage = 1;
                break;
            case 'prev':
                if (this.currentPage > 1) this.currentPage--;
                break;
            case 'next':
                if (this.currentPage < this.totalPages) this.currentPage++;
                break;
            case 'last':
                this.currentPage = this.totalPages;
                break;
            case 'zoom-in':
                this.zoomLevel = Math.min(this.zoomLevel + 25, 500);
                break;
            case 'zoom-out':
                this.zoomLevel = Math.max(this.zoomLevel - 25, 25);
                break;
            case 'fit-width':
                this.zoomLevel = 120;
                this.showToast('幅に合わせて表示');
                break;
            case 'fit-page':
                this.zoomLevel = 100;
                this.showToast('ページ全体を表示');
                break;
            case 'split':
                this.showToast('分割表示モード');
                break;
            case 'fullscreen':
                this.showToast('全画面表示モード');
                break;
            case 'rotate-left':
                this.showToast('左に90°回転');
                break;
            case 'rotate-right':
                this.showToast('右に90°回転');
                break;
            case 'bookmark':
                this.showToast('ブックマークに追加');
                break;
            case 'share':
                this.showToast('共有メニューを開く');
                break;
        }
        
        this.updateDisplay();
        this.announcePageChange();
    }

    handleMobileAction(action) {
        switch (action) {
            case 'prev':
                if (this.currentPage > 1) this.currentPage--;
                break;
            case 'next':
                if (this.currentPage < this.totalPages) this.currentPage++;
                break;
            case 'zoom-toggle':
                this.zoomLevel = this.zoomLevel === 100 ? 150 : 100;
                break;
            case 'more':
                this.toggleMobileSecondary();
                return; // 表示更新をスキップ
        }
        
        this.updateDisplay();
    }

    toggleMobileSecondary() {
        const secondaryRow = document.querySelector('.mobile-row.secondary');
        
        if (secondaryRow) {
            this.isMobileSecondaryVisible = !this.isMobileSecondaryVisible;
            
            if (this.isMobileSecondaryVisible) {
                secondaryRow.classList.remove('hidden');
            } else {
                secondaryRow.classList.add('hidden');
            }
        }
    }

    updateDisplay() {
        // ページ情報の更新
        const pageInputs = document.querySelectorAll('.page-input-enhanced, .current-page');
        pageInputs.forEach(input => {
            if (input.tagName === 'INPUT') {
                input.value = this.currentPage;
            } else {
                input.textContent = this.currentPage;
            }
        });

        // ズームレベルの更新
        const zoomDisplays = document.querySelectorAll('.zoom-level, .zoom-display');
        zoomDisplays.forEach(display => {
            display.textContent = `${this.zoomLevel}%`;
        });

        // ボタンの有効/無効状態
        this.updateButtonStates();
    }

    updateButtonStates() {
        const firstBtns = document.querySelectorAll('[data-action="first"], [data-action="prev"]');
        const lastBtns = document.querySelectorAll('[data-action="last"], [data-action="next"]');
        
        firstBtns.forEach(btn => {
            btn.disabled = this.currentPage === 1;
            btn.style.opacity = this.currentPage === 1 ? '0.5' : '1';
        });
        
        lastBtns.forEach(btn => {
            btn.disabled = this.currentPage === this.totalPages;
            btn.style.opacity = this.currentPage === this.totalPages ? '0.5' : '1';
        });
    }

    addInteractiveEffects() {
        // ホバーエフェクトの追加
        const enhancedBtns = document.querySelectorAll('.enhanced-btn');
        
        enhancedBtns.forEach(btn => {
            btn.addEventListener('mouseenter', () => {
                this.createRippleEffect(btn, 'hover');
            });
        });

        // フォーカスリングのカスタマイズ
        this.setupCustomFocusRings();
        
        // パララックス効果（軽微）
        this.setupParallaxEffects();
    }

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
        
        // アニメーション開始
        requestAnimationFrame(() => {
            ripple.style.transform = 'translate(-50%, -50%) scale(1)';
            ripple.style.opacity = type === 'hover' ? '1' : '0';
        });
        
        // クリーンアップ
        setTimeout(() => {
            if (ripple.parentNode) {
                ripple.parentNode.removeChild(ripple);
            }
        }, 600);
    }

    addClickEffect(button) {
        this.createRippleEffect(button, 'click');
        
        // クリック時のスケールエフェクト
        button.style.transform = 'translateY(-2px) scale(0.98)';
        setTimeout(() => {
            button.style.transform = '';
        }, 150);
    }

    addMobileClickEffect(button) {
        // モバイル用のより強いフィードバック
        button.style.transform = 'scale(0.9)';
        button.style.backgroundColor = '#1557b0';
        
        setTimeout(() => {
            button.style.transform = '';
            button.style.backgroundColor = '';
        }, 200);
        
        // 触覚フィードバック（対応デバイスのみ）
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
    }

    showTooltip(button) {
        const existingTooltip = document.querySelector('.custom-tooltip');
        if (existingTooltip) {
            existingTooltip.remove();
        }

        const tooltip = document.createElement('div');
        tooltip.className = 'custom-tooltip';
        tooltip.textContent = button.getAttribute('aria-label') || 
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
            z-index: 1000;
            pointer-events: none;
            backdrop-filter: blur(8px);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
            transform: translateY(-100%);
            margin-top: -8px;
        `;
        
        document.body.appendChild(tooltip);
        
        const buttonRect = button.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        
        tooltip.style.left = `${buttonRect.left + buttonRect.width / 2 - tooltipRect.width / 2}px`;
        tooltip.style.top = `${buttonRect.top}px`;
        
        // フェードイン
        tooltip.style.opacity = '0';
        tooltip.style.transition = 'opacity 0.2s ease-out, transform 0.2s ease-out';
        requestAnimationFrame(() => {
            tooltip.style.opacity = '1';
            tooltip.style.transform = 'translateY(-100%) translateY(-4px)';
        });
    }

    hideTooltip() {
        const tooltip = document.querySelector('.custom-tooltip');
        if (tooltip) {
            tooltip.style.opacity = '0';
            tooltip.style.transform = 'translateY(-100%)';
            setTimeout(() => {
                if (tooltip.parentNode) {
                    tooltip.parentNode.removeChild(tooltip);
                }
            }, 200);
        }
    }

    showToast(message) {
        const existingToast = document.querySelector('.demo-toast');
        if (existingToast) {
            existingToast.remove();
        }

        const toast = document.createElement('div');
        toast.className = 'demo-toast';
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
            z-index: 1001;
            backdrop-filter: blur(8px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            transform: translateX(100%);
            transition: transform 0.3s cubic-bezier(0.2, 0, 0, 1);
        `;
        
        document.body.appendChild(toast);
        
        // スライドイン
        requestAnimationFrame(() => {
            toast.style.transform = 'translateX(0)';
        });
        
        // 自動削除
        setTimeout(() => {
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }

    setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            // デモ用のキーボードショートカット
            if (e.target.tagName === 'INPUT') return;
            
            switch (e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    this.handleControlAction('prev');
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.handleControlAction('next');
                    break;
                case 'Home':
                    e.preventDefault();
                    this.handleControlAction('first');
                    break;
                case 'End':
                    e.preventDefault();
                    this.handleControlAction('last');
                    break;
                case '+':
                case '=':
                    e.preventDefault();
                    this.handleControlAction('zoom-in');
                    break;
                case '-':
                    e.preventDefault();
                    this.handleControlAction('zoom-out');
                    break;
                case 'f':
                case 'F':
                    e.preventDefault();
                    this.handleControlAction('fit-page');
                    break;
                case 'w':
                case 'W':
                    e.preventDefault();
                    this.handleControlAction('fit-width');
                    break;
            }
        });
    }

    setupCustomFocusRings() {
        const focusableElements = document.querySelectorAll('.enhanced-btn, .mobile-btn, .toggle-secondary');
        
        focusableElements.forEach(element => {
            element.addEventListener('focus', () => {
                element.style.outline = '2px solid #4285f4';
                element.style.outlineOffset = '2px';
            });
            
            element.addEventListener('blur', () => {
                element.style.outline = '';
                element.style.outlineOffset = '';
            });
        });
    }

    setupParallaxEffects() {
        // 軽微なパララックス効果
        window.addEventListener('scroll', () => {
            const scrollY = window.scrollY;
            const demoAreas = document.querySelectorAll('.demo-area');
            
            demoAreas.forEach((area, index) => {
                const speed = 0.1 + (index * 0.05);
                area.style.transform = `translateY(${scrollY * speed}px)`;
            });
        });
    }

    initializeAccessibility() {
        // ARIA属性の動的更新
        this.updateAriaAttributes();
        
        // ライブリージョンの設定
        this.setupLiveRegions();
        
        // スクリーンリーダー用の追加情報
        this.addScreenReaderSupport();
    }

    updateAriaAttributes() {
        const pageInputs = document.querySelectorAll('.page-input-enhanced');
        pageInputs.forEach(input => {
            input.setAttribute('aria-label', `ページ番号、1から${this.totalPages}まで入力可能`);
            input.setAttribute('aria-valuemin', '1');
            input.setAttribute('aria-valuemax', this.totalPages.toString());
            input.setAttribute('aria-valuenow', this.currentPage.toString());
        });
    }

    setupLiveRegions() {
        // スクリーンリーダー用のライブリージョンを作成
        if (!document.getElementById('sr-live-region')) {
            const liveRegion = document.createElement('div');
            liveRegion.id = 'sr-live-region';
            liveRegion.setAttribute('aria-live', 'polite');
            liveRegion.setAttribute('aria-atomic', 'true');
            liveRegion.style.cssText = `
                position: absolute;
                left: -10000px;
                width: 1px;
                height: 1px;
                overflow: hidden;
            `;
            document.body.appendChild(liveRegion);
        }
    }

    announceToScreenReader(message) {
        const liveRegion = document.getElementById('sr-live-region');
        if (liveRegion) {
            liveRegion.textContent = message;
        }
    }

    announcePageChange() {
        this.announceToScreenReader(`ページ ${this.currentPage} / ${this.totalPages}`);
    }

    addScreenReaderSupport() {
        // 各コントロールグループにロールとラベルを追加
        const navigationGroup = document.querySelector('.control-group.navigation');
        if (navigationGroup) {
            navigationGroup.setAttribute('role', 'group');
            navigationGroup.setAttribute('aria-label', 'ページナビゲーション');
        }

        const zoomGroup = document.querySelector('.control-group.zoom');
        if (zoomGroup) {
            zoomGroup.setAttribute('role', 'group');
            zoomGroup.setAttribute('aria-label', 'ズームコントロール');
        }

        const viewGroup = document.querySelector('.control-group.view');
        if (viewGroup) {
            viewGroup.setAttribute('role', 'group');
            viewGroup.setAttribute('aria-label', '表示オプション');
        }
    }

    // パフォーマンス監視（開発用）
    measurePerformance(operation, callback) {
        const start = performance.now();
        const result = callback();
        const end = performance.now();
        
        console.log(`${operation}: ${(end - start).toFixed(2)}ms`);
        return result;
    }

    // デモ用のリセット機能
    reset() {
        this.currentPage = 1;
        this.zoomLevel = 100;
        this.isSecondaryExpanded = false;
        this.isMobileSecondaryVisible = false;
        
        // UI の状態をリセット
        const expandableControls = document.querySelector('.expandable-controls');
        const secondaryRow = document.querySelector('.mobile-row.secondary');
        
        if (expandableControls) {
            expandableControls.classList.add('hidden');
        }
        
        if (secondaryRow) {
            secondaryRow.classList.add('hidden');
        }
        
        this.updateDisplay();
        this.showToast('デモをリセットしました');
    }
}

// ページ読み込み完了後にデモを初期化
document.addEventListener('DOMContentLoaded', () => {
    const demo = new HoverControlsDemo();
    
    // グローバルに参照を保存（デバッグ用）
    window.hoverControlsDemo = demo;
    
    // デモ用のリセットボタンを追加
    const resetBtn = document.createElement('button');
    resetBtn.textContent = '🔄 デモリセット';
    resetBtn.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 12px 24px;
        background: #ea4335;
        color: white;
        border: none;
        border-radius: 24px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(234, 67, 53, 0.3);
        transition: all 0.2s ease;
        z-index: 1000;
    `;
    
    resetBtn.addEventListener('click', () => {
        demo.reset();
    });
    
    resetBtn.addEventListener('mouseenter', () => {
        resetBtn.style.transform = 'translateY(-2px)';
        resetBtn.style.boxShadow = '0 4px 12px rgba(234, 67, 53, 0.4)';
    });
    
    resetBtn.addEventListener('mouseleave', () => {
        resetBtn.style.transform = '';
        resetBtn.style.boxShadow = '0 2px 8px rgba(234, 67, 53, 0.3)';
    });
    
    document.body.appendChild(resetBtn);
    
    // 初期状態のアナウンス
    setTimeout(() => {
        demo.announceToScreenReader('ホバーコントローラー改善案のデモが読み込まれました。キーボードでの操作も可能です。');
    }, 1000);
});

// エクスポート（モジュール使用時）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HoverControlsDemo;
}