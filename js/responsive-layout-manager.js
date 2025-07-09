/**
 * レスポンシブレイアウトマネージャー
 * - 動的フォントサイズ調整
 * - 要素間隔の最適化
 * - 画面サイズ変更対応
 * - デバイス方向変更対応
 */
class ResponsiveLayoutManager {
    constructor(viewer) {
        this.viewer = viewer;
        this.baseSize = 16; // ベースフォントサイズ (px)
        this.currentBreakpoint = this.getCurrentBreakpoint();
        this.isInitialized = false;
        
        // ブレークポイント定義
        this.breakpoints = {
            mobile: { min: 0, max: 480, scale: 0.875 },
            mobileStd: { min: 481, max: 768, scale: 1.0 },
            tablet: { min: 769, max: 1023, scale: 1.125 },
            desktop: { min: 1024, max: 1439, scale: 1.25 },
            large: { min: 1440, max: Infinity, scale: 1.375 }
        };
        
        this.init();
    }
    
    init() {
        this.applyInitialStyles();
        this.setupEventListeners();
        this.adjustLayout();
        this.isInitialized = true;
    }
    
    applyInitialStyles() {
        // CSS変数を設定
        document.documentElement.style.setProperty('--responsive-scale', this.getScaleFactor());
        document.documentElement.style.setProperty('--base-font-size', `${this.baseSize}px`);
    }
    
    setupEventListeners() {
        // リサイズイベント（デバウンス処理）
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.handleResize();
            }, 250);
        });
        
        // オリエンテーション変更
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.handleOrientationChange();
            }, 100);
        });
        
        // ズーム変更検出
        window.addEventListener('resize', () => {
            this.detectZoomChange();
        });
    }
    
    getCurrentBreakpoint() {
        const width = window.innerWidth;
        
        for (const [name, bp] of Object.entries(this.breakpoints)) {
            if (width >= bp.min && width <= bp.max) {
                return name;
            }
        }
        return 'desktop';
    }
    
    getScaleFactor() {
        const breakpoint = this.getCurrentBreakpoint();
        return this.breakpoints[breakpoint].scale;
    }
    
    adjustLayout() {
        const newBreakpoint = this.getCurrentBreakpoint();
        const hasChanged = newBreakpoint !== this.currentBreakpoint;
        
        if (hasChanged || !this.isInitialized) {
            this.currentBreakpoint = newBreakpoint;
            
            // スケールファクターを更新
            const scale = this.getScaleFactor();
            document.documentElement.style.setProperty('--responsive-scale', scale);
            
            // 各要素のサイズを調整
            this.adjustFontSizes(scale);
            this.adjustSpacing(scale);
            this.adjustControlSizes(scale);
            this.adjustSidebarWidth(scale);
            
            // ブレークポイント変更イベントを発火
            this.dispatchBreakpointChange(newBreakpoint);
        }
    }
    
    adjustFontSizes(scale) {
        const elements = {
            // ヘッダー
            '.header h1': { base: 18, min: 14, max: 22 },
            '.header-badge': { base: 12, min: 10, max: 14 },
            
            // サイドバー
            '.toc h2': { base: 18, min: 16, max: 20 },
            '.toc-section-title': { base: 14, min: 12, max: 16 },
            '.toc-text': { base: 14, min: 12, max: 16 },
            
            // コントロール
            '.control-btn': { base: 14, min: 12, max: 16 },
            '.page-info': { base: 14, min: 12, max: 16 },
            '.page-input': { base: 14, min: 12, max: 16 },
            '.zoom-display': { base: 12, min: 10, max: 14 },
            
            // ステータス
            '.status-bar': { base: 13, min: 11, max: 15 }
        };
        
        for (const [selector, config] of Object.entries(elements)) {
            const targetSize = Math.round(config.base * scale);
            const clampedSize = Math.max(config.min, Math.min(config.max, targetSize));
            
            const elementsToUpdate = document.querySelectorAll(selector);
            elementsToUpdate.forEach(el => {
                el.style.fontSize = `${clampedSize}px`;
            });
        }
    }
    
    adjustSpacing(scale) {
        const spacingRules = {
            // パディング調整
            '.controls': { 
                property: 'padding',
                base: { mobile: '8px 12px', tablet: '12px 20px', desktop: '16px 24px' }
            },
            '.toc': { 
                property: 'padding',
                base: { mobile: '16px', tablet: '20px', desktop: '24px' }
            },
            '.svg-container': { 
                property: 'padding',
                base: { mobile: '4px', tablet: '8px', desktop: '12px' }
            },
            
            // ギャップ調整
            '.page-controls': { 
                property: 'gap',
                base: { mobile: '8px', tablet: '12px', desktop: '16px' }
            },
            '.zoom-controls': { 
                property: 'gap',
                base: { mobile: '6px', tablet: '8px', desktop: '10px' }
            }
        };
        
        for (const [selector, config] of Object.entries(spacingRules)) {
            const elements = document.querySelectorAll(selector);
            const baseValue = this.getBreakpointValue(config.base);
            
            elements.forEach(el => {
                el.style[config.property] = baseValue;
            });
        }
    }
    
    adjustControlSizes(scale) {
        const buttonSizes = {
            mobile: { width: '42px', height: '42px', borderRadius: '6px' },
            mobileStd: { width: '46px', height: '46px', borderRadius: '8px' },
            tablet: { width: '44px', height: '44px', borderRadius: '8px' },
            desktop: { width: '48px', height: '48px', borderRadius: '8px' },
            large: { width: '52px', height: '52px', borderRadius: '10px' }
        };
        
        const currentSizes = buttonSizes[this.currentBreakpoint] || buttonSizes.desktop;
        
        const buttons = document.querySelectorAll('.control-btn');
        buttons.forEach(btn => {
            Object.assign(btn.style, currentSizes);
        });
        
        // ズームボタンも調整
        const zoomBtns = document.querySelectorAll('.zoom-btn');
        zoomBtns.forEach(btn => {
            btn.style.minWidth = currentSizes.width;
            btn.style.height = currentSizes.height;
            btn.style.borderRadius = currentSizes.borderRadius;
        });
    }
    
    adjustSidebarWidth(scale) {
        const sidebarWidths = {
            mobile: 'calc(100vw - 40px)',
            mobileStd: '320px',
            tablet: '280px',
            desktop: '320px',
            large: '360px'
        };
        
        const targetWidth = sidebarWidths[this.currentBreakpoint] || sidebarWidths.desktop;
        
        // CSS変数を更新
        document.documentElement.style.setProperty('--sidebar-width', targetWidth);
        
        // サイドバー要素に直接適用
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.style.width = targetWidth;
        }
    }
    
    getBreakpointValue(values) {
        if (typeof values === 'string') return values;
        
        // モバイル系の統合
        if (this.currentBreakpoint === 'mobile' && values.mobile) {
            return values.mobile;
        } else if (this.currentBreakpoint === 'mobileStd' && (values.mobile || values.mobileStd)) {
            return values.mobileStd || values.mobile;
        } else if (this.currentBreakpoint === 'tablet' && values.tablet) {
            return values.tablet;
        } else if (values.desktop) {
            return values.desktop;
        }
        
        return values.mobile || values.tablet || values.desktop || '0';
    }
    
    handleResize() {
        this.adjustLayout();
        
        // SVGコンテナのサイズ再計算
        if (this.viewer && this.viewer.svgViewer) {
            this.viewer.svgViewer.updateContainerDimensions();
        }
    }
    
    handleOrientationChange() {
        // オリエンテーション変更後の調整
        setTimeout(() => {
            this.adjustLayout();
            
            // モバイルメニューが開いている場合は閉じる
            if (this.viewer && this.viewer.mobileMenu && this.viewer.mobileMenu.isOpen) {
                this.viewer.mobileMenu.closeMobileMenu();
            }
        }, 150);
    }
    
    detectZoomChange() {
        // ブラウザズーム変更の検出
        const devicePixelRatio = window.devicePixelRatio || 1;
        
        if (this.lastDevicePixelRatio && this.lastDevicePixelRatio !== devicePixelRatio) {
            // ズーム変更を検出した場合の調整
            this.adjustLayout();
        }
        
        this.lastDevicePixelRatio = devicePixelRatio;
    }
    
    dispatchBreakpointChange(newBreakpoint) {
        const event = new CustomEvent('breakpointChange', {
            detail: {
                from: this.currentBreakpoint,
                to: newBreakpoint,
                scale: this.getScaleFactor()
            }
        });
        
        document.dispatchEvent(event);
    }
    
    // 外部から呼び出し可能なメソッド
    forceUpdate() {
        this.currentBreakpoint = null; // 強制的に更新
        this.adjustLayout();
    }
    
    getCurrentScale() {
        return this.getScaleFactor();
    }
    
    getCurrentBreakpointName() {
        return this.currentBreakpoint;
    }
    
    // デバッグ用
    getDebugInfo() {
        return {
            breakpoint: this.currentBreakpoint,
            scale: this.getScaleFactor(),
            windowSize: `${window.innerWidth}x${window.innerHeight}`,
            devicePixelRatio: window.devicePixelRatio
        };
    }
    
    // クリーンアップ
    destroy() {
        window.removeEventListener('resize', this.handleResize);
        window.removeEventListener('orientationchange', this.handleOrientationChange);
    }
}