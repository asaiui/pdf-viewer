/**
 * Service Worker for PDF Viewer Optimization
 * PDFファイルとリソースの効率的キャッシュ戦略
 */

const CACHE_VERSION = 'pdf-viewer-v2.1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const PDF_CACHE = `${CACHE_VERSION}-pdf`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

// キャッシュするリソース
const STATIC_RESOURCES = [
    '/',
    '/index.html',
    '/style.css',
    '/js/main.js',
    '/js/pdf-loader.js',
    '/js/page-navigator.js',
    '/js/zoom-manager.js',
    '/js/fullscreen-manager.js',
    '/js/content-analyzer.js',
    '/js/mobile-menu.js',
    '/js/demo-content.js',
    '/manifest.json'
];

// PDF.jsリソース
const PDFJS_RESOURCES = [
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
];

// Service Worker インストール
self.addEventListener('install', event => {
    console.log('Service Worker installing...');
    
    event.waitUntil(
        Promise.all([
            // 静的リソースのキャッシュ
            caches.open(STATIC_CACHE).then(cache => {
                console.log('Caching static resources');
                return cache.addAll(STATIC_RESOURCES);
            }),
            
            // PDF.jsリソースのキャッシュ
            caches.open(RUNTIME_CACHE).then(cache => {
                console.log('Caching PDF.js resources');
                return cache.addAll(PDFJS_RESOURCES);
            })
        ]).then(() => {
            console.log('Service Worker installed successfully');
            self.skipWaiting();
        })
    );
});

// Service Worker アクティベート
self.addEventListener('activate', event => {
    console.log('Service Worker activating...');
    
    event.waitUntil(
        // 古いキャッシュの削除
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName.startsWith('pdf-viewer-') && 
                        !cacheName.startsWith(CACHE_VERSION)) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('Service Worker activated');
            return self.clients.claim();
        })
    );
});

// ネットワークリクエストの処理
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    
    // PDFファイルの特別な処理
    if (url.pathname.endsWith('.pdf')) {
        event.respondWith(handlePDFRequest(event.request));
        return;
    }
    
    // PDF.jsリソースの処理
    if (PDFJS_RESOURCES.some(resource => event.request.url.includes(resource))) {
        event.respondWith(handlePDFJSRequest(event.request));
        return;
    }
    
    // 静的リソースの処理
    if (STATIC_RESOURCES.includes(url.pathname) || url.pathname === '/') {
        event.respondWith(handleStaticRequest(event.request));
        return;
    }
    
    // その他のリクエスト（キャッシュファースト戦略）
    event.respondWith(handleRuntimeRequest(event.request));
});

// PDFファイルの処理（ストリーミング対応）
async function handlePDFRequest(request) {
    const cache = await caches.open(PDF_CACHE);
    
    try {
        // キャッシュから確認
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
            console.log('PDF served from cache:', request.url);
            return cachedResponse;
        }
        
        // ネットワークから取得
        console.log('Fetching PDF from network:', request.url);
        const response = await fetch(request);
        
        if (response.ok) {
            // PDFファイルをキャッシュ（5MB以下の場合のみ）
            const responseClone = response.clone();
            const contentLength = response.headers.get('content-length');
            
            if (!contentLength || parseInt(contentLength) < 5 * 1024 * 1024) {
                cache.put(request, responseClone);
                console.log('PDF cached successfully');
            }
        }
        
        return response;
    } catch (error) {
        console.error('PDF fetch failed:', error);
        throw error;
    }
}

// PDF.jsリソースの処理（ネットワークファースト）
async function handlePDFJSRequest(request) {
    const cache = await caches.open(RUNTIME_CACHE);
    
    try {
        // ネットワークを優先して試行
        const response = await fetch(request, { timeout: 5000 });
        if (response.ok) {
            cache.put(request, response.clone());
            return response;
        }
    } catch (error) {
        console.warn('Network failed for PDF.js resource, trying cache');
    }
    
    // キャッシュから提供
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
        return cachedResponse;
    }
    
    throw new Error('PDF.js resource unavailable');
}

// 静的リソースの処理（キャッシュファースト）
async function handleStaticRequest(request) {
    const cache = await caches.open(STATIC_CACHE);
    
    // キャッシュから確認
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
        return cachedResponse;
    }
    
    // ネットワークから取得してキャッシュ
    try {
        const response = await fetch(request);
        if (response.ok) {
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        console.error('Static resource fetch failed:', error);
        throw error;
    }
}

// ランタイムリクエストの処理
async function handleRuntimeRequest(request) {
    const cache = await caches.open(RUNTIME_CACHE);
    
    try {
        // ネットワークを試行
        const response = await fetch(request, { timeout: 3000 });
        if (response.ok) {
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        // キャッシュから提供
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        throw error;
    }
}

// バックグラウンド同期（PWA機能）
self.addEventListener('sync', event => {
    if (event.tag === 'pdf-preload') {
        event.waitUntil(preloadPDFResources());
    }
});

// PDFリソースのプリロード
async function preloadPDFResources() {
    const cache = await caches.open(PDF_CACHE);
    
    // 標準フォントとCMapのプリロード
    const resources = [
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/standard_fonts/'
    ];
    
    for (const resource of resources) {
        try {
            const response = await fetch(resource);
            if (response.ok) {
                await cache.put(resource, response);
            }
        } catch (error) {
            console.warn('Failed to preload resource:', resource);
        }
    }
}

// メッセージ処理（アプリケーションとの通信）
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'CACHE_PDF') {
        event.waitUntil(cachePDFFile(event.data.url));
    }
    
    if (event.data && event.data.type === 'GET_CACHE_STATUS') {
        event.ports[0].postMessage({
            type: 'CACHE_STATUS',
            cached: getCacheStatus()
        });
    }
});

// PDFファイルの手動キャッシュ
async function cachePDFFile(url) {
    const cache = await caches.open(PDF_CACHE);
    try {
        const response = await fetch(url);
        if (response.ok) {
            await cache.put(url, response);
            console.log('PDF manually cached:', url);
        }
    } catch (error) {
        console.error('Failed to cache PDF:', error);
    }
}

// キャッシュ状況の取得
async function getCacheStatus() {
    const cacheNames = await caches.keys();
    const status = {};
    
    for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();
        status[cacheName] = keys.length;
    }
    
    return status;
}