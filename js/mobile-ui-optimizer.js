/**
 * モバイルUI最適化
 * 画面サイズに応じてボタンテキストとレイアウトを動的調整
 */
class MobileUIOptimizer {
    constructor(viewer) {
        this.viewer = viewer;
        this.isMobile = window.innerWidth <= 480;
        
        // ボタンテキストのマッピング
        this.buttonTextMap = {
            desktop: {
                fitWidthBtn: '幅調整',
                fitPageBtn: '全体',
                fullscreenBtn: '⛶'
            },
            mobile: {
                fitWidthBtn: '幅',
                fitPageBtn: '全',
                fullscreenBtn: '⛶'
            },
            tiny: {
                fitWidthBtn: '幅',
                fitPageBtn: '全',
                fullscreenBtn: '⛶'
            }
        };
        
        this.initialize();
    }
    
    initialize() {
        this.optimizeForCurrentScreen();
        this.bindResizeListener();
        
        console.log('MobileUIOptimizer initialized');
    }
    
    bindResizeListener() {
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.optimizeForCurrentScreen();
            }, 250);
        });
    }
    
    optimizeForCurrentScreen() {
        const width = window.innerWidth;
        const wasMobile = this.isMobile;
        
        this.isMobile = width <= 480;
        
        // 画面サイズカテゴリを決定
        let category = 'desktop';
        if (width <= 360) {
            category = 'tiny';
        } else if (width <= 480) {
            category = 'mobile';
        }
        
        // ボタンテキストを更新
        this.updateButtonTexts(category);
        
        // レイアウトクラスを更新
        this.updateLayoutClasses(category);
        
        // モバイルUI状態が変わった場合の処理
        if (wasMobile !== this.isMobile) {
            this.onMobileStateChange();
        }
    }
    
    updateButtonTexts(category) {
        const textMap = this.buttonTextMap[category];
        
        Object.entries(textMap).forEach(([buttonId, text]) => {
            const button = document.getElementById(buttonId);
            if (button) {
                // title属性は保持し、表示テキストのみ変更
                const originalTitle = button.getAttribute('title') || button.getAttribute('aria-label');
                button.textContent = text;
                if (originalTitle) {
                    button.setAttribute('title', originalTitle);
                }
            }
        });
    }
    
    updateLayoutClasses(category) {
        const body = document.body;
        
        // 既存のモバイルクラスを削除
        body.classList.remove('mobile-ui', 'tiny-ui', 'desktop-ui');
        
        // 新しいクラスを追加
        switch (category) {
            case 'tiny':
                body.classList.add('tiny-ui', 'mobile-ui');
                break;
            case 'mobile':
                body.classList.add('mobile-ui');
                break;
            default:
                body.classList.add('desktop-ui');
        }
    }
    
    onMobileStateChange() {
        // モバイル⇔デスクトップ切り替え時の処理
        if (this.isMobile) {
            this.enableMobileOptimizations();
        } else {
            this.disableMobileOptimizations();
        }
    }
    
    enableMobileOptimizations() {
        // モバイル専用の最適化を有効化
        this.optimizeControlsLayout();
        this.optimizeTouchTargets();
        this.enableMobileFeatures();
    }
    
    disableMobileOptimizations() {
        // デスクトップ用の設定に戻す
        this.restoreDesktopLayout();
        this.disableMobileFeatures();
    }
    
    optimizeControlsLayout() {
        const controls = document.getElementById('controls');
        if (!controls) return;
        
        // モバイル用クラスを追加
        controls.classList.add('mobile-optimized');
        
        // コントロール要素の順序を最適化
        this.reorderControlElements();
    }
    
    reorderControlElements() {
        const controls = document.getElementById('controls');
        const pageControls = controls?.querySelector('.page-controls');
        const zoomControls = controls?.querySelector('.zoom-controls');
        
        if (pageControls && zoomControls) {
            // モバイルでは重要な機能を上に配置
            controls.appendChild(pageControls);
            controls.appendChild(zoomControls);
        }
    }
    
    optimizeTouchTargets() {
        // タッチターゲットサイズの最適化
        const buttons = document.querySelectorAll('.controls button');
        buttons.forEach(button => {
            if (this.isMobile) {
                button.classList.add('touch-optimized');
            } else {
                button.classList.remove('touch-optimized');
            }
        });
    }
    
    enableMobileFeatures() {
        // モバイル専用機能を有効化
        if (this.viewer.mobileTouchHandler) {
            this.viewer.mobileTouchHandler.enable();
        }
        
        // スクロール防止
        document.body.style.touchAction = 'manipulation';
    }
    
    disableMobileFeatures() {
        // モバイル専用機能を無効化
        if (this.viewer.mobileTouchHandler) {
            this.viewer.mobileTouchHandler.disable();
        }
        
        // スクロール復元
        document.body.style.touchAction = '';
    }
    
    restoreDesktopLayout() {
        const controls = document.getElementById('controls');
        if (controls) {
            controls.classList.remove('mobile-optimized');
        }
    }
    
    // 動的にボタンテキストを短縮
    shortenButtonText(text, maxLength = 4) {
        if (text.length <= maxLength) return text;
        
        // 漢字の短縮マッピング
        const shortMap = {
            '幅調整': '幅',
            '全体': '全',
            '拡大': '+',
            '縮小': '-',
            '最初': '⇤',
            '最後': '⇥',
            '前のページ': '◀',
            '次のページ': '▶'
        };
        
        return shortMap[text] || text.substring(0, maxLength);
    }
    
    // 画面情報を取得
    getScreenInfo() {
        return {
            width: window.innerWidth,
            height: window.innerHeight,
            ratio: window.devicePixelRatio || 1,
            orientation: window.innerWidth > window.innerHeight ? 'landscape' : 'portrait',
            isMobile: this.isMobile,
            category: window.innerWidth <= 360 ? 'tiny' : (window.innerWidth <= 480 ? 'mobile' : 'desktop')
        };
    }
    
    // デバッグ用: 画面情報表示
    showScreenInfo() {
        const info = this.getScreenInfo();
        console.log('Screen Info:', info);
        return info;
    }
}