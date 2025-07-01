/**
 * PDF内容分析・目次更新機能
 */
class ContentAnalyzer {
    constructor(viewer) {
        this.viewer = viewer;
    }

    // PDFの内容を分析して実際のページ構成を把握
    async analyzePDFContent(pdf) {
        if (!pdf) return;

        console.log('PDFの内容を分析中...');
        const pageAnalysis = [];

        try {
            // 分析ページ数を減らして負荷軽減（最初の5ページのみ）
            const maxPagesToAnalyze = Math.min(pdf.numPages, 5);
            
            for (let pageNum = 1; pageNum <= maxPagesToAnalyze; pageNum++) {
                try {
                    const page = await pdf.getPage(pageNum);
                    
                    // テキスト抽出をタイムアウト付きで実行
                    const textPromise = page.getTextContent();
                    const timeoutPromise = new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('テキスト抽出タイムアウト')), 5000)
                    );
                    
                    const textContent = await Promise.race([textPromise, timeoutPromise]);
                    
                    // テキストを抽出（最大1000文字まで）
                    const text = textContent.items
                        .map(item => item.str)
                        .join(' ')
                        .substring(0, 1000);
                    
                    // ページの特徴を分析
                    const analysis = this.analyzePageContent(pageNum, text);
                    pageAnalysis.push(analysis);
                    
                    console.log(`ページ ${pageNum}:`, analysis);
                    
                } catch (error) {
                    console.warn(`ページ ${pageNum} の分析に失敗:`, error);
                    // エラーが発生してもデフォルト分析結果を追加
                    pageAnalysis.push({
                        pageNumber: pageNum,
                        type: pageNum === 1 ? 'cover' : 'unknown',
                        title: pageNum === 1 ? '表紙' : `ページ ${pageNum}`,
                        keywords: [],
                        textLength: 0
                    });
                }
            }

            // 分析結果をログ出力
            console.log('PDF分析結果:', pageAnalysis);
            
            // 実際の構成に基づいて目次を動的に更新
            this.updateTableOfContents(pageAnalysis);

        } catch (error) {
            console.error('PDF内容分析エラー:', error);
        }
    }

    // ページ内容の特徴を分析
    analyzePageContent(pageNum, text) {
        const analysis = {
            pageNumber: pageNum,
            type: 'unknown',
            title: '',
            keywords: [],
            textLength: text.length
        };

        // テキストを小文字に変換して解析
        const lowerText = text.toLowerCase();

        // ページタイプの判定
        if (pageNum === 1) {
            analysis.type = 'cover';
            analysis.title = '表紙';
        } else if (lowerText.includes('目次') || lowerText.includes('contents')) {
            analysis.type = 'toc';
            analysis.title = '目次';
        } else if (lowerText.includes('学校長') || lowerText.includes('校長') || lowerText.includes('あいさつ')) {
            analysis.type = 'greeting';
            analysis.title = '学校長あいさつ';
        } else if (lowerText.includes('魅力') || lowerText.includes('特色') || lowerText.includes('特徴')) {
            analysis.type = 'features';
            analysis.title = 'ISCの魅力';
        } else if (lowerText.includes('大学') && lowerText.includes('違い')) {
            analysis.type = 'comparison';
            analysis.title = '大学との違い';
        } else if (lowerText.includes('情報セキュリティ')) {
            analysis.type = 'department';
            analysis.title = '情報セキュリティ学科';
        } else if (lowerText.includes('ai') || lowerText.includes('人工知能')) {
            analysis.type = 'department';
            analysis.title = '実践AI科';
        } else if (lowerText.includes('システム') && lowerText.includes('先端')) {
            analysis.type = 'department';
            analysis.title = '先端ITシステム科';
        } else if (lowerText.includes('情報処理')) {
            analysis.type = 'department';
            analysis.title = '情報処理科';
        } else if (lowerText.includes('iot')) {
            analysis.type = 'department';
            analysis.title = '実践IoT科';
        } else if (lowerText.includes('web') || lowerText.includes('ウェブ')) {
            analysis.type = 'department';
            analysis.title = 'Web技術科';
        } else if (lowerText.includes('ビジネス')) {
            analysis.type = 'department';
            analysis.title = 'ビジネス科';
        } else if (lowerText.includes('資格')) {
            analysis.type = 'support';
            analysis.title = '資格取得サポート';
        } else if (lowerText.includes('就職')) {
            analysis.type = 'support';
            analysis.title = '就職サポート';
        } else if (lowerText.includes('卒業生') || lowerText.includes('先輩')) {
            analysis.type = 'graduates';
            analysis.title = '卒業生の声';
        } else if (lowerText.includes('施設') || lowerText.includes('設備')) {
            analysis.type = 'facilities';
            analysis.title = '施設・設備';
        } else if (lowerText.includes('キャンパス') || lowerText.includes('学生生活')) {
            analysis.type = 'campus';
            analysis.title = 'キャンパスライフ';
        } else if (lowerText.includes('学費') || lowerText.includes('入学')) {
            analysis.type = 'admission';
            analysis.title = '入学・学費';
        } else if (lowerText.includes('アクセス') || lowerText.includes('交通')) {
            analysis.type = 'access';
            analysis.title = 'アクセス';
        }

        // キーワード抽出
        const keywords = ['情報', '技術', 'IT', 'AI', 'システム', 'セキュリティ', 'プログラミング', 'Web', 'IoT', 'ビジネス'];
        analysis.keywords = keywords.filter(keyword => lowerText.includes(keyword.toLowerCase()));

        return analysis;
    }

    // 分析結果に基づいて目次を動的に更新
    updateTableOfContents(pageAnalysis) {
        console.log('目次を動的に更新中...');
        
        // 分析結果をタイプ別にグループ化
        const groupedPages = {
            introduction: [],
            departments: [],
            support: [],
            facilities: [],
            admission: []
        };

        pageAnalysis.forEach(page => {
            switch (page.type) {
                case 'cover':
                case 'toc':
                case 'greeting':
                case 'features':
                case 'comparison':
                    groupedPages.introduction.push(page);
                    break;
                case 'department':
                    groupedPages.departments.push(page);
                    break;
                case 'support':
                case 'graduates':
                    groupedPages.support.push(page);
                    break;
                case 'facilities':
                case 'campus':
                    groupedPages.facilities.push(page);
                    break;
                case 'admission':
                case 'access':
                    groupedPages.admission.push(page);
                    break;
            }
        });

        // 検出されたページ情報を元に目次リンクを更新
        this.updateTocLinks(groupedPages);
    }

    // 目次リンクを実際のページ番号で更新
    updateTocLinks(groupedPages) {
        // 学校紹介セクションの更新
        const introLinks = document.querySelectorAll('.toc-section:first-child .toc-link');
        groupedPages.introduction.forEach((page, index) => {
            if (introLinks[index]) {
                introLinks[index].setAttribute('data-page', page.pageNumber);
                if (page.title) {
                    introLinks[index].textContent = page.title;
                }
            }
        });

        // 学科・コース紹介セクションの更新
        const deptLinks = document.querySelectorAll('.toc-section:nth-child(2) .toc-link');
        groupedPages.departments.forEach((page, index) => {
            if (deptLinks[index]) {
                deptLinks[index].setAttribute('data-page', page.pageNumber);
                if (page.title) {
                    deptLinks[index].textContent = page.title;
                }
            }
        });

        // サポート体制セクションの更新
        const supportLinks = document.querySelectorAll('.toc-section:nth-child(3) .toc-link');
        groupedPages.support.forEach((page, index) => {
            if (supportLinks[index]) {
                supportLinks[index].setAttribute('data-page', page.pageNumber);
                if (page.title) {
                    supportLinks[index].textContent = page.title;
                }
            }
        });

        // 施設・環境セクションの更新
        const facilityLinks = document.querySelectorAll('.toc-section:nth-child(4) .toc-link');
        groupedPages.facilities.forEach((page, index) => {
            if (facilityLinks[index]) {
                facilityLinks[index].setAttribute('data-page', page.pageNumber);
                if (page.title) {
                    facilityLinks[index].textContent = page.title;
                }
            }
        });

        // 入学情報セクションの更新
        const admissionLinks = document.querySelectorAll('.toc-section:nth-child(5) .toc-link');
        groupedPages.admission.forEach((page, index) => {
            if (admissionLinks[index]) {
                admissionLinks[index].setAttribute('data-page', page.pageNumber);
                if (page.title) {
                    admissionLinks[index].textContent = page.title;
                }
            }
        });

        console.log('目次の更新が完了しました');
    }
}