
/**
 * アプリケーション設定ファイル
 * 環境変数や設定値を一元管理します。
 */
const APP_CONFIG = {
    // PDFファイルのパス設定
    PDF_PATHS: [
        'pdf/school-guide-2026.pdf',
        './pdf/school-guide-2026.pdf',
        'school-guide-2026.pdf',
        'pdf/250307_学校案内2026最終データ_A3見開き_情報科学専門学校様 (1).pdf'
    ],

    // PDF.jsのCDN設定
    CDN_SOURCES: {
        pdfjs: [
            {
                name: 'cloudflare',
                baseUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174',
                priority: 1,
            },
            {
                name: 'jsdelivr',
                baseUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build',
                priority: 2,
            },
            {
                name: 'unpkg',
                baseUrl: 'https://unpkg.com/pdfjs-dist@3.11.174/build',
                priority: 3,
            }
        ]
    },
    
    // PDF.jsのファイル構成
    PDFJS_FILES: {
        pdf: '/pdf.min.js',
        worker: '/pdf.worker.min.js',
        cmaps: '/cmaps/',
        fonts: '/standard_fonts/'
    },

    // ビューアのデフォルト設定
    VIEWER_DEFAULTS: {
        DEFAULT_ZOOM: 1.2,
        MOBILE_BREAKPOINT: 768,
        MAX_CACHED_PAGES: 10,
        RENDER_DEBOUNCE_TIME: 50, // ms
    },

    // 機能の有効/無効フラグ
    FEATURE_FLAGS: {
        ENABLE_PERFORMANCE_MONITOR: true,
        ENABLE_PROGRESSIVE_LOADING: true,
        ENABLE_PARALLEL_RENDERING: false, // 実験的機能
        ENABLE_INTELLIGENT_PREFETCH: false, // 実験的機能
    }
};

// グローバルスコープで設定を凍結して利用可能にする
window.APP_CONFIG = Object.freeze(APP_CONFIG);
