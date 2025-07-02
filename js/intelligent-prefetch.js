/**
 * Intelligent Prefetch System
 * AI駆動の予測的読み込みシステム
 */
class IntelligentPrefetch {
    constructor(viewer) {
        this.viewer = viewer;
        this.userBehavior = {
            pageSequence: [],
            viewDurations: new Map(),
            scrollPatterns: [],
            zoomPreferences: new Map(),
            timeOfDay: new Map()
        };
        
        this.predictions = {
            nextPages: [],
            readingSpeed: 0,
            preferredZoom: 1.0,
            sessionType: 'sequential'
        };
        
        this.prefetchCache = new Map();
        this.learningModel = new SimpleMLModel();
        this.isLearning = true;
        
        this.initializeIntelligentPrefetch();
    }
    
    initializeIntelligentPrefetch() {
        // ユーザー行動の監視
        this.startBehaviorTracking();
        
        // 予測モデルの初期化
        this.initializePredictionModel();
        
        // 定期的な学習と予測
        this.startLearningCycle();
        
        console.log('🧠 Intelligent Prefetch System initialized');
    }
    
    // ユーザー行動追跡開始
    startBehaviorTracking() {
        let sessionStartTime = Date.now();
        let currentPageStartTime = Date.now();
        let lastScrollTime = 0;
        
        // ページ変更の監視
        const originalGoToPage = this.viewer.goToPage.bind(this.viewer);
        this.viewer.goToPage = (pageNumber) => {
            this.recordPageChange(pageNumber, currentPageStartTime);
            currentPageStartTime = Date.now();
            originalGoToPage(pageNumber);
            this.updatePredictions();
        };
        
        // スクロール行動の監視
        document.addEventListener('wheel', (event) => {
            const now = Date.now();
            if (now - lastScrollTime > 100) { // デバウンス
                this.recordScrollBehavior(event);
                lastScrollTime = now;
            }
        });
        
        // ズーム行動の監視
        const originalZoomIn = this.viewer.zoomIn.bind(this.viewer);
        const originalZoomOut = this.viewer.zoomOut.bind(this.viewer);
        
        this.viewer.zoomIn = () => {
            this.recordZoomBehavior('in', this.viewer.currentZoom);
            originalZoomIn();
        };
        
        this.viewer.zoomOut = () => {
            this.recordZoomBehavior('out', this.viewer.currentZoom);
            originalZoomOut();
        };
        
        // セッション分析
        window.addEventListener('beforeunload', () => {
            this.analyzeSession(sessionStartTime);
        });
    }
    
    // ページ変更記録
    recordPageChange(pageNumber, startTime) {
        const duration = Date.now() - startTime;
        
        // ページシーケンスの記録
        this.userBehavior.pageSequence.push({
            page: pageNumber,
            timestamp: Date.now(),
            duration
        });
        
        // ページ閲覧時間の記録
        this.userBehavior.viewDurations.set(pageNumber, duration);
        
        // 読書速度の計算
        this.calculateReadingSpeed();
        
        // シーケンスサイズ制限
        if (this.userBehavior.pageSequence.length > 50) {
            this.userBehavior.pageSequence.shift();
        }
        
        console.log(`📊 Page ${pageNumber} viewed for ${duration}ms`);
    }
    
    // スクロール行動記録
    recordScrollBehavior(event) {
        this.userBehavior.scrollPatterns.push({
            deltaY: event.deltaY,
            timestamp: Date.now(),
            page: this.viewer.currentPage
        });
        
        // パターンサイズ制限
        if (this.userBehavior.scrollPatterns.length > 100) {
            this.userBehavior.scrollPatterns.shift();
        }
    }
    
    // ズーム行動記録
    recordZoomBehavior(direction, currentZoom) {
        const pageZooms = this.userBehavior.zoomPreferences.get(this.viewer.currentPage) || [];
        pageZooms.push({ direction, zoom: currentZoom, timestamp: Date.now() });
        
        this.userBehavior.zoomPreferences.set(this.viewer.currentPage, pageZooms);
        
        console.log(`🔍 Zoom ${direction} on page ${this.viewer.currentPage} (${currentZoom.toFixed(2)}x)`);
    }
    
    // 読書速度計算
    calculateReadingSpeed() {
        if (this.userBehavior.pageSequence.length < 3) return;
        
        const recentPages = this.userBehavior.pageSequence.slice(-5);
        const totalTime = recentPages.reduce((sum, page) => sum + page.duration, 0);
        const avgTimePerPage = totalTime / recentPages.length;
        
        this.predictions.readingSpeed = avgTimePerPage;
    }
    
    // 予測モデル初期化
    initializePredictionModel() {
        this.learningModel.addFeatures([
            'current_page',
            'time_on_page',
            'scroll_frequency',
            'zoom_level',
            'session_duration',
            'page_sequence_pattern'
        ]);
    }
    
    // 学習サイクル開始
    startLearningCycle() {
        // 30秒ごとに学習と予測を更新
        setInterval(() => {
            if (this.isLearning) {
                this.trainModel();
                this.updatePredictions();
                this.executePrefetching();
            }
        }, 30000);
    }
    
    // モデル訓練
    trainModel() {
        if (this.userBehavior.pageSequence.length < 5) return;
        
        const trainingData = this.generateTrainingData();
        
        trainingData.forEach(data => {
            this.learningModel.train(data.features, data.nextPage);
        });
        
        console.log(`🎓 Model trained with ${trainingData.length} samples`);
    }
    
    // 訓練データ生成
    generateTrainingData() {
        const data = [];
        const sequence = this.userBehavior.pageSequence;
        
        for (let i = 0; i < sequence.length - 1; i++) {
            const current = sequence[i];
            const next = sequence[i + 1];
            
            const features = {
                current_page: current.page,
                time_on_page: current.duration,
                scroll_frequency: this.getScrollFrequency(current.page),
                zoom_level: this.getPreferredZoom(current.page),
                session_duration: Date.now() - sequence[0].timestamp,
                page_sequence_pattern: this.getSequencePattern(i)
            };
            
            data.push({
                features,
                nextPage: next.page
            });
        }
        
        return data;
    }
    
    // スクロール頻度取得
    getScrollFrequency(page) {
        const scrolls = this.userBehavior.scrollPatterns.filter(s => s.page === page);
        return scrolls.length;
    }
    
    // 好みのズームレベル取得
    getPreferredZoom(page) {
        const zooms = this.userBehavior.zoomPreferences.get(page);
        if (!zooms || zooms.length === 0) return 1.0;
        
        return zooms[zooms.length - 1].zoom;
    }
    
    // シーケンスパターン取得
    getSequencePattern(index) {
        const sequence = this.userBehavior.pageSequence;
        if (index < 2) return 0;
        
        const prev2 = sequence[index - 2].page;
        const prev1 = sequence[index - 1].page;
        const current = sequence[index].page;
        
        // 簡単なパターン分類
        if (current === prev1 + 1 && prev1 === prev2 + 1) return 1; // 順次読み
        if (current === prev1 - 1 && prev1 === prev2 - 1) return 2; // 逆読み
        if (Math.abs(current - prev1) > 5) return 3; // ジャンプ読み
        
        return 0; // ランダム読み
    }
    
    // 予測更新
    updatePredictions() {
        if (!this.learningModel.isTrained()) return;
        
        const currentFeatures = {
            current_page: this.viewer.currentPage,
            time_on_page: this.getCurrentPageDuration(),
            scroll_frequency: this.getScrollFrequency(this.viewer.currentPage),
            zoom_level: this.viewer.currentZoom,
            session_duration: this.getSessionDuration(),
            page_sequence_pattern: this.getCurrentSequencePattern()
        };
        
        // 次ページ予測
        const predictedPages = this.learningModel.predict(currentFeatures);
        this.predictions.nextPages = predictedPages.slice(0, 3); // 上位3ページ
        
        // セッションタイプの分類
        this.predictions.sessionType = this.classifySessionType();
        
        console.log(`🔮 Predictions updated: ${this.predictions.nextPages.join(', ')}`);
    }
    
    // 現在ページの滞在時間取得
    getCurrentPageDuration() {
        const sequence = this.userBehavior.pageSequence;
        if (sequence.length === 0) return 0;
        
        const lastEntry = sequence[sequence.length - 1];
        return Date.now() - lastEntry.timestamp;
    }
    
    // セッション時間取得
    getSessionDuration() {
        const sequence = this.userBehavior.pageSequence;
        if (sequence.length === 0) return 0;
        
        return Date.now() - sequence[0].timestamp;
    }
    
    // 現在のシーケンスパターン取得
    getCurrentSequencePattern() {
        const sequence = this.userBehavior.pageSequence;
        if (sequence.length < 3) return 0;
        
        return this.getSequencePattern(sequence.length - 1);
    }
    
    // セッションタイプ分類
    classifySessionType() {
        const sequence = this.userBehavior.pageSequence;
        if (sequence.length < 5) return 'exploring';
        
        const recentPages = sequence.slice(-5);
        const isSequential = recentPages.every((page, i) => 
            i === 0 || Math.abs(page.page - recentPages[i-1].page) <= 2
        );
        
        if (isSequential) return 'sequential';
        
        const hasJumps = recentPages.some((page, i) => 
            i > 0 && Math.abs(page.page - recentPages[i-1].page) > 5
        );
        
        return hasJumps ? 'research' : 'browsing';
    }
    
    // プリフェッチ実行
    async executePrefetching() {
        if (this.predictions.nextPages.length === 0) return;
        
        console.log('🚀 Executing intelligent prefetch...');
        
        // 予測されたページをプリロード
        for (const pageNumber of this.predictions.nextPages) {
            if (pageNumber <= this.viewer.totalPages && !this.prefetchCache.has(pageNumber)) {
                await this.prefetchPage(pageNumber);
            }
        }
        
        // セッションタイプに基づく追加プリフェッチ
        await this.executeContextualPrefetch();
    }
    
    // ページプリフェッチ
    async prefetchPage(pageNumber) {
        try {
            if (this.viewer.progressiveLoader) {
                await this.viewer.progressiveLoader.loadPageData(pageNumber);
                this.prefetchCache.set(pageNumber, Date.now());
                console.log(`✅ Prefetched page ${pageNumber}`);
            }
        } catch (error) {
            console.warn(`Failed to prefetch page ${pageNumber}:`, error);
        }
    }
    
    // コンテキスト依存プリフェッチ
    async executeContextualPrefetch() {
        const currentPage = this.viewer.currentPage;
        
        switch (this.predictions.sessionType) {
            case 'sequential':
                // 順次読みの場合は前後のページを積極的にプリロード
                await this.prefetchRange(currentPage + 1, currentPage + 3);
                break;
                
            case 'research':
                // 研究用途の場合は目次や索引ページをプリロード
                await this.prefetchImportantPages();
                break;
                
            case 'browsing':
                // ブラウジングの場合は表紙や章の最初のページをプリロード
                await this.prefetchChapterStartPages();
                break;
        }
    }
    
    // 範囲プリフェッチ
    async prefetchRange(start, end) {
        for (let page = start; page <= Math.min(end, this.viewer.totalPages); page++) {
            if (!this.prefetchCache.has(page)) {
                await this.prefetchPage(page);
            }
        }
    }
    
    // 重要ページプリフェッチ
    async prefetchImportantPages() {
        const importantPages = [1, 2]; // 表紙、目次
        
        for (const page of importantPages) {
            if (page <= this.viewer.totalPages && !this.prefetchCache.has(page)) {
                await this.prefetchPage(page);
            }
        }
    }
    
    // 章開始ページプリフェッチ
    async prefetchChapterStartPages() {
        // 簡易的な章開始ページ推定（実際はコンテンツ解析が必要）
        const estimatedChapterStarts = [];
        const totalPages = this.viewer.totalPages;
        
        for (let i = 1; i <= totalPages; i += Math.ceil(totalPages / 10)) {
            estimatedChapterStarts.push(i);
        }
        
        for (const page of estimatedChapterStarts) {
            if (!this.prefetchCache.has(page)) {
                await this.prefetchPage(page);
            }
        }
    }
    
    // セッション分析
    analyzeSession(startTime) {
        const sessionData = {
            duration: Date.now() - startTime,
            pagesViewed: this.userBehavior.pageSequence.length,
            averageTimePerPage: this.predictions.readingSpeed,
            sessionType: this.predictions.sessionType,
            zoomUsage: this.userBehavior.zoomPreferences.size,
            scrollActivity: this.userBehavior.scrollPatterns.length
        };
        
        console.log('📈 Session Analysis:', sessionData);
        
        // 学習データとして保存（実装では localStorage など）
        this.saveSessionData(sessionData);
    }
    
    // セッションデータ保存
    saveSessionData(sessionData) {
        try {
            const existingData = JSON.parse(localStorage.getItem('pdfViewerSessions') || '[]');
            existingData.push(sessionData);
            
            // 最新50セッションのみ保持
            if (existingData.length > 50) {
                existingData.shift();
            }
            
            localStorage.setItem('pdfViewerSessions', JSON.stringify(existingData));
        } catch (error) {
            console.warn('Failed to save session data:', error);
        }
    }
    
    // 統計取得
    getStats() {
        return {
            behavior: {
                pagesViewed: this.userBehavior.pageSequence.length,
                avgViewTime: this.predictions.readingSpeed,
                sessionType: this.predictions.sessionType
            },
            predictions: {
                nextPages: this.predictions.nextPages,
                confidence: this.learningModel.getConfidence()
            },
            prefetch: {
                cachedPages: this.prefetchCache.size,
                hitRate: this.calculatePrefetchHitRate()
            }
        };
    }
    
    // プリフェッチヒット率計算
    calculatePrefetchHitRate() {
        const sequence = this.userBehavior.pageSequence;
        if (sequence.length < 2) return 0;
        
        let hits = 0;
        for (let i = 1; i < sequence.length; i++) {
            if (this.prefetchCache.has(sequence[i].page)) {
                hits++;
            }
        }
        
        return (hits / (sequence.length - 1)) * 100;
    }
    
    // クリーンアップ
    cleanup() {
        this.isLearning = false;
        this.prefetchCache.clear();
        console.log('Intelligent Prefetch System cleaned up');
    }
}

/**
 * Simple Machine Learning Model
 * 軽量な機械学習モデル
 */
class SimpleMLModel {
    constructor() {
        this.features = [];
        this.trainingData = [];
        this.weights = new Map();
        this.trained = false;
    }
    
    addFeatures(features) {
        this.features = features;
        features.forEach(feature => {
            this.weights.set(feature, Math.random() - 0.5);
        });
    }
    
    train(features, target) {
        this.trainingData.push({ features, target });
        
        // 簡易的な学習（実際はより複雑なアルゴリズムを使用）
        const prediction = this.calculatePrediction(features);
        const error = target - prediction;
        
        // 重み更新
        this.features.forEach(feature => {
            const currentWeight = this.weights.get(feature);
            const featureValue = features[feature] || 0;
            const newWeight = currentWeight + 0.01 * error * featureValue;
            this.weights.set(feature, newWeight);
        });
        
        this.trained = true;
    }
    
    predict(features) {
        if (!this.trained) return [];
        
        const prediction = this.calculatePrediction(features);
        
        // 予測結果を近くのページ番号に変換
        const currentPage = features.current_page || 1;
        const candidates = [];
        
        // 順次読みの可能性
        candidates.push(currentPage + 1);
        candidates.push(currentPage + 2);
        
        // 戻り読みの可能性
        if (currentPage > 1) {
            candidates.push(currentPage - 1);
        }
        
        return candidates.filter(page => page > 0);
    }
    
    calculatePrediction(features) {
        let prediction = 0;
        
        this.features.forEach(feature => {
            const weight = this.weights.get(feature);
            const value = features[feature] || 0;
            prediction += weight * value;
        });
        
        return prediction;
    }
    
    isTrained() {
        return this.trained;
    }
    
    getConfidence() {
        return this.trainingData.length > 10 ? 0.8 : 0.3;
    }
}