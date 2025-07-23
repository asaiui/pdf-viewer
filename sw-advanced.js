/**
 * Advanced Service Worker - 高度な最適化システム
 * WebPキャッシュ、OffscreenCanvas対応、インテリジェント戦略
 */

const CACHE_VERSION = 'pdf-viewer-v3.0';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const WEBP_CACHE = `${CACHE_VERSION}-webp`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const PROGRESSIVE_CACHE = `${CACHE_VERSION}-progressive`;

// キャッシュするリソース（最新構成に対応）
const STATIC_RESOURCES = [
    '/',
    '/index.html',
    '/style.css',
    '/manifest.json',
    // Core JS files
    '/js/main.js',
    '/js/config.js',
    '/js/webp-viewer.js',
    '/js/async-manager.js',
    '/js/canvas-renderer.js',
    '/js/progressive-loader.js',
    '/js/offscreen-manager.js',
    '/js/offscreen-worker.js',
    // Support systems
    '/js/dom-cache.js',
    '/js/event-manager.js',
    '/js/performance-monitor.js',
    // UI components
    '/js/mobile-menu.js',
    '/js/mobile-ui-optimizer.js',
    '/js/unified-touch-handler.js',
    '/js/fullscreen-manager.js',
    '/js/content-analyzer.js',
    '/js/responsive-layout-manager.js',
    '/js/cdn-manager.js'
];

// WebPファイルのパターン
const WEBP_PATTERNS = [
    /\/Webp\/.*\.webp$/,
    /webp.*\.webp$/
];

// Progressive Loading キャッシュ戦略
const PROGRESSIVE_STRATEGIES = {
    thumbnail: { maxAge: 24 * 60 * 60 * 1000, priority: 'high' }, // 24時間
    preview: { maxAge: 12 * 60 * 60 * 1000, priority: 'medium' }, // 12時間
    standard: { maxAge: 6 * 60 * 60 * 1000, priority: 'medium' }, // 6時間
    full: { maxAge: 3 * 60 * 60 * 1000, priority: 'low' } // 3時間
};

// パフォーマンス監視
let swStats = {
    cacheHits: 0,
    cacheMisses: 0,
    webpRequests: 0,
    progressiveRequests: 0,
    networkRequests: 0,
    errors: 0
};

/**
 * Service Worker インストール
 */
self.addEventListener('install', event => {
    console.log('Advanced Service Worker installing...');
    
    event.waitUntil(
        Promise.all([
            // 静的リソースのキャッシュ
            caches.open(STATIC_CACHE).then(cache => {
                console.log('Caching static resources');
                return cache.addAll(STATIC_RESOURCES);
            }),
            
            // WebPキャッシュの準備
            caches.open(WEBP_CACHE).then(cache => {
                console.log('WebP cache initialized');
                return Promise.resolve();
            }),
            
            // Progressive Loading キャッシュの準備
            caches.open(PROGRESSIVE_CACHE).then(cache => {
                console.log('Progressive cache initialized');
                return Promise.resolve();
            })
            
        ]).then(() => {
            console.log('Advanced Service Worker installed');
            // 即座にアクティブ化
            return self.skipWaiting();
        })
    );
});

/**
 * Service Worker アクティベーション
 */
self.addEventListener('activate', event => {
    console.log('Advanced Service Worker activating...');
    
    event.waitUntil(
        Promise.all([
            // 古いキャッシュの削除
            cleanupOldCaches(),
            
            // 新しいクライアントの制御開始
            self.clients.claim()
            
        ]).then(() => {
            console.log('Advanced Service Worker activated');
        })
    );
});

/**
 * フェッチイベント処理（メイン処理）
 */
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    
    // WebPファイルの処理
    if (isWebPRequest(url.pathname)) {
        event.respondWith(handleWebPRequest(event.request));
        return;
    }
    
    // 静的リソースの処理
    if (isStaticResource(url.pathname)) {
        event.respondWith(handleStaticResource(event.request));
        return;
    }
    
    // Progressive Loading リクエストの処理
    if (isProgressiveRequest(event.request)) {
        event.respondWith(handleProgressiveRequest(event.request));
        return;
    }
    
    // デフォルトのネットワーク優先戦略
    event.respondWith(handleDefaultRequest(event.request));
});

/**
 * WebPリクエストの判定
 */
function isWebPRequest(pathname) {
    return WEBP_PATTERNS.some(pattern => pattern.test(pathname));
}

/**
 * 静的リソースの判定
 */
function isStaticResource(pathname) {
    return STATIC_RESOURCES.some(resource => 
        pathname === resource || pathname.endsWith(resource)
    );
}

/**
 * Progressive Loading リクエストの判定
 */
function isProgressiveRequest(request) {
    const url = new URL(request.url);
    return url.searchParams.has('progressive-stage');
}

/**
 * WebPリクエストの処理
 */
async function handleWebPRequest(request) {
    swStats.webpRequests++;
    
    try {
        // キャッシュ優先戦略
        const cache = await caches.open(WEBP_CACHE);
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
            swStats.cacheHits++;
            console.log('WebP cache hit:', request.url);
            return cachedResponse;
        }
        
        // ネットワークからフェッチ
        swStats.cacheMisses++;
        swStats.networkRequests++;
        
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            // レスポンスをキャッシュ（WebPは長期キャッシュ）
            cache.put(request, networkResponse.clone());
            console.log('WebP cached:', request.url);
        }
        
        return networkResponse;
        
    } catch (error) {
        swStats.errors++;
        console.error('WebP request failed:', error);
        
        // フォールバック：キャッシュから古いバージョンを返す
        const cache = await caches.open(WEBP_CACHE);
        const fallbackResponse = await cache.match(request);
        
        if (fallbackResponse) {
            return fallbackResponse;
        }
        
        // エラーレスポンスを返す
        return new Response('WebP load failed', { 
            status: 500, 
            statusText: 'WebP Loading Error' 
        });
    }
}

/**
 * 静的リソースの処理
 */
async function handleStaticResource(request) {
    try {
        // キャッシュ優先戦略
        const cache = await caches.open(STATIC_CACHE);
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
            swStats.cacheHits++;
            return cachedResponse;
        }
        
        // ネットワークからフェッチしてキャッシュ
        swStats.cacheMisses++;
        swStats.networkRequests++;
        
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
        
    } catch (error) {
        swStats.errors++;
        console.error('Static resource failed:', error);
        
        // キャッシュフォールバック
        const cache = await caches.open(STATIC_CACHE);
        return await cache.match(request) || new Response('Resource not found', { status: 404 });
    }
}

/**
 * Progressive Loading リクエストの処理
 */
async function handleProgressiveRequest(request) {
    swStats.progressiveRequests++;
    
    const url = new URL(request.url);
    const stage = url.searchParams.get('progressive-stage');
    const strategy = PROGRESSIVE_STRATEGIES[stage] || PROGRESSIVE_STRATEGIES.standard;
    
    try {
        const cache = await caches.open(PROGRESSIVE_CACHE);
        const cachedResponse = await cache.match(request);
        
        // キャッシュの有効期限チェック
        if (cachedResponse) {
            const cacheDate = new Date(cachedResponse.headers.get('sw-cache-date'));
            const now = new Date();
            
            if (now - cacheDate < strategy.maxAge) {
                swStats.cacheHits++;
                return cachedResponse;
            }
        }
        
        // ネットワークからフェッチ
        swStats.cacheMisses++;
        swStats.networkRequests++;
        
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            // レスポンスヘッダーにキャッシュ日時を追加
            const modifiedResponse = new Response(networkResponse.body, {
                status: networkResponse.status,
                statusText: networkResponse.statusText,
                headers: {
                    ...Object.fromEntries(networkResponse.headers),
                    'sw-cache-date': new Date().toISOString(),
                    'sw-cache-stage': stage
                }
            });
            
            cache.put(request, modifiedResponse.clone());
            return modifiedResponse;
        }
        
        return networkResponse;
        
    } catch (error) {
        swStats.errors++;
        console.error('Progressive request failed:', error);
        
        // フォールバック
        const cache = await caches.open(PROGRESSIVE_CACHE);
        return await cache.match(request) || new Response('Progressive load failed', { status: 500 });
    }
}

/**
 * デフォルトリクエストの処理
 */
async function handleDefaultRequest(request) {
    try {
        swStats.networkRequests++;
        
        // ネットワーク優先戦略
        const networkResponse = await fetch(request);
        
        // ランタイムキャッシュに保存（GET リクエストのみ）
        if (request.method === 'GET' && networkResponse.ok) {
            const cache = await caches.open(RUNTIME_CACHE);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
        
    } catch (error) {
        swStats.errors++;
        
        // ランタイムキャッシュからフォールバック
        const cache = await caches.open(RUNTIME_CACHE);
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
            swStats.cacheHits++;
            return cachedResponse;
        }
        
        return new Response('Network error', { status: 500 });
    }
}

/**
 * 古いキャッシュのクリーンアップ
 */
async function cleanupOldCaches() {
    const cacheNames = await caches.keys();
    const currentCaches = [STATIC_CACHE, WEBP_CACHE, RUNTIME_CACHE, PROGRESSIVE_CACHE];
    
    const deletePromises = cacheNames
        .filter(cacheName => !currentCaches.includes(cacheName))
        .map(cacheName => {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
        });
    
    return Promise.all(deletePromises);
}

/**
 * クライアントからのメッセージ処理
 */
self.addEventListener('message', event => {
    const { type, data } = event.data;
    
    switch (type) {
        case 'GET_SW_STATS':
            event.ports[0].postMessage({
                type: 'SW_STATS',
                data: {
                    ...swStats,
                    cacheHitRate: swStats.cacheHits / (swStats.cacheHits + swStats.cacheMisses) || 0,
                    version: CACHE_VERSION
                }
            });
            break;
            
        case 'CLEAR_CACHE':
            clearSpecificCache(data.cacheType).then(() => {
                event.ports[0].postMessage({
                    type: 'CACHE_CLEARED',
                    data: { cacheType: data.cacheType }
                });
            });
            break;
            
        case 'PRELOAD_WEBP':
            preloadWebPFiles(data.fileList).then(result => {
                event.ports[0].postMessage({
                    type: 'PRELOAD_COMPLETE',
                    data: result
                });
            });
            break;
            
        case 'CACHE_SVG':
            // 旧バージョンとの互換性
            console.log('Legacy CACHE_SVG message received');
            break;
            
        default:
            console.warn('Unknown message type:', type);
    }
});

/**
 * 特定キャッシュのクリア
 */
async function clearSpecificCache(cacheType) {
    const cacheMap = {
        'static': STATIC_CACHE,
        'webp': WEBP_CACHE,
        'runtime': RUNTIME_CACHE,
        'progressive': PROGRESSIVE_CACHE
    };
    
    const cacheName = cacheMap[cacheType];
    if (cacheName) {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();
        await Promise.all(keys.map(key => cache.delete(key)));
        console.log(`Cleared ${cacheType} cache (${keys.length} entries)`);
    }
}

/**
 * WebPファイルのプリロード
 */
async function preloadWebPFiles(fileList) {
    const cache = await caches.open(WEBP_CACHE);
    const results = {
        success: 0,
        failed: 0,
        cached: 0
    };
    
    for (const filePath of fileList) {
        try {
            // 既にキャッシュされているかチェック
            const cached = await cache.match(filePath);
            if (cached) {
                results.cached++;
                continue;
            }
            
            // ファイルをフェッチしてキャッシュ
            const response = await fetch(filePath);
            if (response.ok) {
                await cache.put(filePath, response);
                results.success++;
            } else {
                results.failed++;
            }
        } catch (error) {
            console.error('Preload failed for:', filePath, error);
            results.failed++;
        }
    }
    
    console.log('WebP preload results:', results);
    return results;
}

/**
 * パフォーマンス統計のリセット
 */
function resetStats() {
    swStats = {
        cacheHits: 0,
        cacheMisses: 0,
        webpRequests: 0,
        progressiveRequests: 0,
        networkRequests: 0,
        errors: 0
    };
}

// 統計を定期的にログ出力（デバッグ用）
if (typeof console !== 'undefined') {
    setInterval(() => {
        console.log('SW Performance Stats:', swStats);
    }, 60000); // 1分間隔
}