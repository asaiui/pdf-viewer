/**
 * IndexedDB マネージャー - 永続キャッシュシステム
 * 高速起動とオフライン対応のための永続的データ保存
 */
class IndexedDBManager {
    constructor(viewer) {
        this.viewer = viewer;
        this.db = null;
        this.dbName = 'PDFViewerCache';
        this.dbVersion = 2;
        this.isInitialized = false;
        
        // ストア定義
        this.stores = {
            images: {
                name: 'images',
                keyPath: 'id',
                indexes: [
                    { name: 'pageNumber', keyPath: 'pageNumber' },
                    { name: 'timestamp', keyPath: 'timestamp' },
                    { name: 'accessCount', keyPath: 'accessCount' }
                ]
            },
            metadata: {
                name: 'metadata',
                keyPath: 'key'
            },
            performance: {
                name: 'performance',
                keyPath: 'id'
            }
        };
        
        // キャッシュ設定
        this.config = {
            maxImagesCached: 15, // 最大15画像をキャッシュ
            maxCacheAge: 7 * 24 * 60 * 60 * 1000, // 7日間
            compressionEnabled: true,
            autoCleanup: true
        };
        
        // 統計情報
        this.stats = {
            hits: 0,
            misses: 0,
            stores: 0,
            deletions: 0,
            errors: 0
        };
        
        this.initializeDB();
    }

    /**
     * IndexedDB の初期化
     */
    async initializeDB() {
        if (!('indexedDB' in window)) {
            console.warn('IndexedDBManager: IndexedDB非対応');
            return false;
        }

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                console.error('IndexedDBManager: DB開放失敗:', request.error);
                this.stats.errors++;
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                this.isInitialized = true;
                console.log('IndexedDBManager: 初期化完了');
                
                // 自動クリーンアップの開始
                if (this.config.autoCleanup) {
                    this.startAutoCleanup();
                }
                
                resolve(true);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                this.createStores(db, event.oldVersion);
            };
        });
    }

    /**
     * ストアの作成
     */
    createStores(db, oldVersion) {
        console.log(`IndexedDBManager: DB更新 v${oldVersion} → v${this.dbVersion}`);

        // 既存のストアを削除（バージョンアップ時）
        if (oldVersion > 0) {
            const existingStores = Array.from(db.objectStoreNames);
            existingStores.forEach(storeName => {
                db.deleteObjectStore(storeName);
            });
        }

        // 画像キャッシュストア
        const imageStore = db.createObjectStore(this.stores.images.name, {
            keyPath: this.stores.images.keyPath
        });
        
        this.stores.images.indexes.forEach(index => {
            imageStore.createIndex(index.name, index.keyPath, { unique: false });
        });

        // メタデータストア
        db.createObjectStore(this.stores.metadata.name, {
            keyPath: this.stores.metadata.keyPath
        });

        // パフォーマンスデータストア
        db.createObjectStore(this.stores.performance.name, {
            keyPath: this.stores.performance.keyPath
        });

        console.log('IndexedDBManager: ストア作成完了');
    }

    /**
     * 画像データの保存
     */
    async storeImage(pageNumber, imageData, metadata = {}) {
        if (!this.isInitialized) {
            console.warn('IndexedDBManager: 未初期化');
            return false;
        }

        try {
            // 画像データの準備
            const imageBlob = await this.prepareImageData(imageData);
            const compressedBlob = this.config.compressionEnabled 
                ? await this.compressBlob(imageBlob)
                : imageBlob;

            const record = {
                id: `page-${pageNumber}`,
                pageNumber: pageNumber,
                blob: compressedBlob,
                size: compressedBlob.size,
                timestamp: Date.now(),
                accessCount: 1,
                metadata: {
                    width: imageData.width || 0,
                    height: imageData.height || 0,
                    type: imageData.type || 'webp',
                    quality: metadata.quality || 'high',
                    ...metadata
                }
            };

            const transaction = this.db.transaction([this.stores.images.name], 'readwrite');
            const store = transaction.objectStore(this.stores.images.name);
            
            await this.promisifyRequest(store.put(record));
            
            this.stats.stores++;
            console.log(`IndexedDBManager: 画像保存完了 page-${pageNumber}`);

            // キャッシュサイズチェック
            this.checkCacheSize();
            
            return true;

        } catch (error) {
            console.error('IndexedDBManager: 画像保存失敗:', error);
            this.stats.errors++;
            return false;
        }
    }

    /**
     * 画像データの取得
     */
    async getImage(pageNumber) {
        if (!this.isInitialized) {
            return null;
        }

        try {
            const transaction = this.db.transaction([this.stores.images.name], 'readwrite');
            const store = transaction.objectStore(this.stores.images.name);
            
            const record = await this.promisifyRequest(store.get(`page-${pageNumber}`));
            
            if (!record) {
                this.stats.misses++;
                return null;
            }

            // アクセス統計の更新
            record.accessCount++;
            record.lastAccess = Date.now();
            await this.promisifyRequest(store.put(record));

            this.stats.hits++;
            
            console.log(`IndexedDBManager: 画像取得成功 page-${pageNumber}`);
            
            // Blobから画像オブジェクトを復元
            return await this.restoreImageData(record);

        } catch (error) {
            console.error('IndexedDBManager: 画像取得失敗:', error);
            this.stats.errors++;
            return null;
        }
    }

    /**
     * 画像データの準備
     */
    async prepareImageData(imageData) {
        if (imageData instanceof Blob) {
            return imageData;
        }

        if (imageData instanceof HTMLImageElement) {
            // Canvas経由でBlobに変換
            const canvas = document.createElement('canvas');
            canvas.width = imageData.naturalWidth;
            canvas.height = imageData.naturalHeight;
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(imageData, 0, 0);
            
            return new Promise(resolve => {
                canvas.toBlob(resolve, 'image/webp', 0.9);
            });
        }

        if (imageData instanceof HTMLCanvasElement) {
            return new Promise(resolve => {
                imageData.toBlob(resolve, 'image/webp', 0.9);
            });
        }

        throw new Error('Unsupported image data type');
    }

    /**
     * Blob圧縮
     */
    async compressBlob(blob) {
        // WebPであれば既に圧縮されているためそのまま返す
        if (blob.type.includes('webp')) {
            return blob;
        }

        // 他の形式の場合は Canvas 経由で WebP に変換
        const img = await this.blobToImage(blob);
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        
        return new Promise(resolve => {
            canvas.toBlob(resolve, 'image/webp', 0.8);
        });
    }

    /**
     * 画像データの復元
     */
    async restoreImageData(record) {
        try {
            const img = await this.blobToImage(record.blob);
            
            return {
                img: img,
                url: img.src, // WebPViewerが期待する形式
                metadata: record.metadata,
                pageNumber: record.pageNumber,
                accessCount: record.accessCount,
                size: record.size,
                source: 'indexeddb'
            };
        } catch (error) {
            console.error('IndexedDBManager: 画像復元失敗:', error);
            throw error;
        }
    }

    /**
     * Blob から Image への変換
     */
    async blobToImage(blob) {
        const url = URL.createObjectURL(blob);
        
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                URL.revokeObjectURL(url);
                resolve(img);
            };
            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('Image load failed'));
            };
            img.src = url;
        });
    }

    /**
     * キャッシュサイズのチェック
     */
    async checkCacheSize() {
        try {
            const transaction = this.db.transaction([this.stores.images.name], 'readwrite');
            const store = transaction.objectStore(this.stores.images.name);
            
            const count = await this.promisifyRequest(store.count());
            
            if (count > this.config.maxImagesCached) {
                await this.cleanupOldImages();
            }

        } catch (error) {
            console.error('IndexedDBManager: キャッシュサイズチェック失敗:', error);
        }
    }

    /**
     * 古い画像の削除
     */
    async cleanupOldImages() {
        try {
            const transaction = this.db.transaction([this.stores.images.name], 'readwrite');
            const store = transaction.objectStore(this.stores.images.name);
            
            // アクセス頻度の低い順にソート
            const index = store.index('accessCount');
            const cursor = await this.promisifyRequest(index.openCursor());
            
            const imagesToDelete = [];
            let current = cursor;
            
            while (current && imagesToDelete.length < 5) { // 最大5つ削除
                const record = current.value;
                const age = Date.now() - record.timestamp;
                
                // 古いまたはアクセス頻度の低い画像を削除対象とする
                if (age > this.config.maxCacheAge || record.accessCount < 2) {
                    imagesToDelete.push(record.id);
                }
                
                current = await this.promisifyRequest(current.continue());
            }

            // 削除実行
            for (const id of imagesToDelete) {
                await this.promisifyRequest(store.delete(id));
                this.stats.deletions++;
            }

            console.log(`IndexedDBManager: ${imagesToDelete.length}件の古い画像を削除`);

        } catch (error) {
            console.error('IndexedDBManager: クリーンアップ失敗:', error);
        }
    }

    /**
     * メタデータの保存
     */
    async storeMetadata(key, data) {
        if (!this.isInitialized) return false;

        try {
            const transaction = this.db.transaction([this.stores.metadata.name], 'readwrite');
            const store = transaction.objectStore(this.stores.metadata.name);
            
            await this.promisifyRequest(store.put({
                key: key,
                data: data,
                timestamp: Date.now()
            }));

            return true;

        } catch (error) {
            console.error('IndexedDBManager: メタデータ保存失敗:', error);
            return false;
        }
    }

    /**
     * メタデータの取得
     */
    async getMetadata(key) {
        if (!this.isInitialized) return null;

        try {
            const transaction = this.db.transaction([this.stores.metadata.name], 'readonly');
            const store = transaction.objectStore(this.stores.metadata.name);
            
            const record = await this.promisifyRequest(store.get(key));
            return record ? record.data : null;

        } catch (error) {
            console.error('IndexedDBManager: メタデータ取得失敗:', error);
            return null;
        }
    }

    /**
     * 自動クリーンアップの開始
     */
    startAutoCleanup() {
        // 5分間隔でクリーンアップ実行
        setInterval(() => {
            this.cleanupOldImages();
        }, 5 * 60 * 1000);

        console.log('IndexedDBManager: 自動クリーンアップ開始');
    }

    /**
     * 統計情報の取得
     */
    getStats() {
        const hitRate = this.stats.hits + this.stats.misses > 0 
            ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
            : 0;

        return {
            ...this.stats,
            hitRate: hitRate + '%',
            isInitialized: this.isInitialized,
            dbName: this.dbName,
            version: this.dbVersion
        };
    }

    /**
     * キャッシュの完全クリア
     */
    async clearCache() {
        if (!this.isInitialized) return false;

        try {
            const transaction = this.db.transaction(Object.values(this.stores).map(s => s.name), 'readwrite');
            
            for (const store of Object.values(this.stores)) {
                const objectStore = transaction.objectStore(store.name);
                await this.promisifyRequest(objectStore.clear());
            }

            console.log('IndexedDBManager: キャッシュクリア完了');
            return true;

        } catch (error) {
            console.error('IndexedDBManager: キャッシュクリア失敗:', error);
            return false;
        }
    }

    /**
     * Request の Promise化
     */
    promisifyRequest(request) {
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * リソースの解放
     */
    destroy() {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
        
        this.isInitialized = false;
        console.log('IndexedDBManager: リソース解放完了');
    }
}

// グローバル参照
window.IndexedDBManager = IndexedDBManager;