/**
 * ページフリップアニメーションマネージャー
 * リアルな本めくりアニメーションとトランジション効果を提供
 */
class PageFlipManager {
    constructor(viewer) {
        this.viewer = viewer;
        this.isAnimating = false;
        this.animationDuration = 800; // ms
        this.flipContainer = null;
        this.currentPageElement = null;
        this.nextPageElement = null;
        
        // アニメーション設定
        this.animationSettings = {
            perspective: 1200,
            flipDuration: 0.8,
            fadeDelay: 0.2,
            easing: 'cubic-bezier(0.25, 0.8, 0.25, 1)'
        };
        
        // パフォーマンス設定
        this.performanceSettings = {
            enableFlip: true,
            enable3D: true,
            maxConcurrentAnimations: 1
        };
        
        this.initializeFlipContainer();
        this.detectPerformanceCapabilities();
    }

    /**
     * デバイスの性能を検出してアニメーション設定を調整
     */
    detectPerformanceCapabilities() {
        // GPU加速のサポートチェック
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        
        if (!gl) {
            console.log('WebGL not supported, disabling 3D animations');
            this.performanceSettings.enable3D = false;
        }
        
        // モバイルデバイスの検出
        const isMobile = window.innerWidth <= 768;
        if (isMobile) {
            this.animationDuration = 600; // モバイルでは短縮
            this.animationSettings.flipDuration = 0.6;
        }
        
        // パフォーマンス監視
        if (this.viewer.performanceMonitor) {
            const avgRenderTime = this.viewer.performanceMonitor.getAverageRenderTime();
            if (avgRenderTime > 100) { // 100ms以上かかる場合は軽量化
                this.performanceSettings.enable3D = false;
                this.animationDuration = 400;
            }
        }
    }

    /**
     * フリップアニメーション用のコンテナを初期化
     */
    initializeFlipContainer() {
        // 既存のコンテナをチェック
        this.flipContainer = document.getElementById('page-flip-container');
        
        if (!this.flipContainer) {
            this.flipContainer = document.createElement('div');
            this.flipContainer.id = 'page-flip-container';
            this.flipContainer.className = 'page-flip-container';
            
            // メインビューアコンテナに追加
            const viewerContainer = document.querySelector('.pdf-viewer-container') || 
                                  document.querySelector('.svg-container') ||
                                  document.body;
            
            viewerContainer.appendChild(this.flipContainer);
        }
        
        this.setupFlipContainerStyles();
    }

    /**
     * フリップコンテナのスタイルを設定
     */
    setupFlipContainerStyles() {
        const styles = `
            .page-flip-container {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                z-index: 1000;
                perspective: ${this.animationSettings.perspective}px;
                overflow: hidden;
            }
            
            .flip-page {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                transform-style: preserve-3d;
                backface-visibility: hidden;
                will-change: transform;
                transition: none;
            }
            
            .flip-page img {
                display: block;
                max-width: 100%;
                max-height: 100%;
                object-fit: contain;
                border-radius: 8px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            }
            
            .flip-page-front,
            .flip-page-back {
                position: absolute;
                width: 100%;
                height: 100%;
                backface-visibility: hidden;
            }
            
            .flip-page-back {
                transform: rotateY(180deg);
            }
            
            /* 右へのフリップアニメーション */
            .flip-right {
                animation: flipToRight ${this.animationSettings.flipDuration}s ${this.animationSettings.easing} forwards;
            }
            
            /* 左へのフリップアニメーション */
            .flip-left {
                animation: flipToLeft ${this.animationSettings.flipDuration}s ${this.animationSettings.easing} forwards;
            }
            
            /* フェードアニメーション（3D無効時） */
            .fade-out {
                animation: fadeOutPage 0.4s ease-out forwards;
            }
            
            .fade-in {
                animation: fadeInPage 0.4s ease-in forwards;
            }
            
            @keyframes flipToRight {
                0% {
                    transform: translate(-50%, -50%) rotateY(0deg);
                }
                50% {
                    transform: translate(-50%, -50%) rotateY(-90deg) scale(0.9);
                }
                100% {
                    transform: translate(-50%, -50%) rotateY(-180deg);
                }
            }
            
            @keyframes flipToLeft {
                0% {
                    transform: translate(-50%, -50%) rotateY(0deg);
                }
                50% {
                    transform: translate(-50%, -50%) rotateY(90deg) scale(0.9);
                }
                100% {
                    transform: translate(-50%, -50%) rotateY(180deg);
                }
            }
            
            @keyframes fadeOutPage {
                0% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1);
                }
                100% {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.95);
                }
            }
            
            @keyframes fadeInPage {
                0% {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(1.05);
                }
                100% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1);
                }
            }
            
            /* モバイル最適化 */
            @media (max-width: 768px) {
                .page-flip-container {
                    perspective: 800px;
                }
                
                .flip-right,
                .flip-left {
                    animation-duration: 0.6s;
                }
            }
            
            /* 低性能デバイス用 */
            @media (prefers-reduced-motion: reduce) {
                .flip-right,
                .flip-left {
                    animation: none;
                }
                
                .flip-page {
                    transition: opacity 0.3s ease;
                }
            }
        `;
        
        // スタイルを動的に追加
        let styleSheet = document.getElementById('page-flip-styles');
        if (!styleSheet) {
            styleSheet = document.createElement('style');
            styleSheet.id = 'page-flip-styles';
            styleSheet.textContent = styles;
            document.head.appendChild(styleSheet);
        }
    }

    /**
     * ページフリップアニメーションを実行
     * @param {string} direction - 'next' or 'prev'
     * @param {HTMLElement} currentElement - 現在のページ要素
     * @param {HTMLElement} nextElement - 次のページ要素
     * @param {Function} callback - アニメーション完了時のコールバック
     */
    async animatePageFlip(direction, currentElement, nextElement, callback) {
        if (this.isAnimating) {
            console.log('Animation already in progress, skipping');
            return;
        }
        
        // パフォーマンス監視開始
        const startTime = performance.now();
        
        this.isAnimating = true;
        
        try {
            if (this.performanceSettings.enable3D && this.performanceSettings.enableFlip) {
                await this.perform3DFlipAnimation(direction, currentElement, nextElement);
            } else {
                await this.performFadeAnimation(currentElement, nextElement);
            }
            
            // パフォーマンス記録
            const animationTime = performance.now() - startTime;
            if (this.viewer.performanceMonitor) {
                this.viewer.performanceMonitor.recordAnimationTime(animationTime);
            }
            
            console.log(`Page flip animation completed in ${animationTime.toFixed(2)}ms`);
            
        } catch (error) {
            console.error('Animation error:', error);
        } finally {
            this.isAnimating = false;
            if (callback) callback();
        }
    }

    /**
     * 3Dフリップアニメーションを実行
     */
    async perform3DFlipAnimation(direction, currentElement, nextElement) {
        return new Promise((resolve) => {
            // フリップページ要素を作成
            const flipPage = this.createFlipPageElement(currentElement);
            const animationClass = direction === 'next' ? 'flip-right' : 'flip-left';
            
            // アニメーション開始
            flipPage.classList.add(animationClass);
            
            // アニメーション完了を待つ
            const handleAnimationEnd = () => {
                flipPage.removeEventListener('animationend', handleAnimationEnd);
                this.cleanupFlipElements();
                resolve();
            };
            
            flipPage.addEventListener('animationend', handleAnimationEnd);
            
            // タイムアウト保護
            setTimeout(() => {
                if (this.isAnimating) {
                    handleAnimationEnd();
                }
            }, this.animationDuration + 100);
        });
    }

    /**
     * フェードアニメーションを実行（フォールバック）
     */
    async performFadeAnimation(currentElement, nextElement) {
        return new Promise((resolve) => {
            const flipPage = this.createFlipPageElement(currentElement);
            
            // フェードアウト
            flipPage.classList.add('fade-out');
            
            setTimeout(() => {
                this.cleanupFlipElements();
                resolve();
            }, 400);
        });
    }

    /**
     * フリップページ要素を作成
     */
    createFlipPageElement(sourceElement) {
        // 既存の要素をクリーンアップ
        this.cleanupFlipElements();
        
        const flipPage = document.createElement('div');
        flipPage.className = 'flip-page';
        
        // ソース要素から画像を複製
        const sourceImg = sourceElement.querySelector('img') || sourceElement;
        if (sourceImg.tagName === 'IMG') {
            const img = sourceImg.cloneNode(true);
            flipPage.appendChild(img);
        } else if (sourceElement.tagName === 'CANVAS') {
            // Canvasの場合は画像として変換
            const canvas = sourceElement;
            const img = document.createElement('img');
            img.src = canvas.toDataURL();
            img.style.width = canvas.style.width;
            img.style.height = canvas.style.height;
            flipPage.appendChild(img);
        }
        
        this.flipContainer.appendChild(flipPage);
        return flipPage;
    }

    /**
     * フリップ要素をクリーンアップ
     */
    cleanupFlipElements() {
        const existingFlipPages = this.flipContainer.querySelectorAll('.flip-page');
        existingFlipPages.forEach(page => {
            page.remove();
        });
    }

    /**
     * アニメーション設定を更新
     */
    updateSettings(newSettings) {
        Object.assign(this.animationSettings, newSettings);
        this.setupFlipContainerStyles(); // スタイルを再生成
    }

    /**
     * アニメーションを無効化
     */
    disableAnimations() {
        this.performanceSettings.enableFlip = false;
        console.log('Page flip animations disabled');
    }

    /**
     * アニメーションを有効化
     */
    enableAnimations() {
        this.performanceSettings.enableFlip = true;
        console.log('Page flip animations enabled');
    }

    /**
     * 現在のアニメーション状態を取得
     */
    isCurrentlyAnimating() {
        return this.isAnimating;
    }

    /**
     * クリーンアップ
     */
    cleanup() {
        this.cleanupFlipElements();
        
        // イベントリスナーの削除
        const styleSheet = document.getElementById('page-flip-styles');
        if (styleSheet) {
            styleSheet.remove();
        }
        
        if (this.flipContainer && this.flipContainer.parentNode) {
            this.flipContainer.parentNode.removeChild(this.flipContainer);
        }
    }
}