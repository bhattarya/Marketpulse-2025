const axios = require('axios');

class EnhancedBoardroomIntelligence {
  constructor() {
    this.newsApiKey = process.env.NEWS_API_KEY;
    this.finnhubKey = process.env.FINNHUB_KEY;
  }

  // Get comprehensive boardroom intelligence from multiple sources
  async getBoardroomIntelligence(ticker, limit = 5) {
    try {
      const [newsInsights, finnhubNews, companyProfile] = await Promise.all([
        this.getNewsBasedInsights(ticker),
        this.getFinnhubCompanyNews(ticker),
        this.getCompanyProfile(ticker)
      ]);

      const combinedInsights = this.analyzeAndCombineData({
        ticker,
        newsInsights,
        finnhubNews,
        companyProfile
      });

      return combinedInsights.slice(0, limit);
    } catch (error) {
      console.error(`Error getting enhanced boardroom intelligence for ${ticker}:`, error.message);
      return this.getFallbackInsights(ticker);
    }
  }

  // Extract boardroom insights from financial news
  async getNewsBasedInsights(ticker) {
    try {
      const boardroomKeywords = [
        'CEO', 'CFO', 'executive', 'management', 'board', 'director',
        'earnings', 'guidance', 'strategy', 'acquisition', 'merger',
        'restructuring', 'leadership', 'succession', 'appointment'
      ];

      const queries = [
        `${ticker} CEO management`,
        `${ticker} earnings guidance`,
        `${ticker} executive leadership`,
        `${ticker} board directors`
      ];

      const insights = [];
      
      for (const query of queries.slice(0, 2)) { // Limit to avoid rate limits
        try {
          const response = await axios.get(
            `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=en&sortBy=publishedAt&pageSize=5&apiKey=${this.newsApiKey}`
          );

          if (response.data.articles) {
            const relevantArticles = response.data.articles.filter(article => 
              boardroomKeywords.some(keyword => 
                (article.title + ' ' + article.description).toLowerCase().includes(keyword)
              )
            );

            insights.push(...relevantArticles.map(article => ({
              type: 'news_based',
              ticker,
              title: article.title,
              summary: article.description || 'No summary available',
              source_url: article.url,
              source: article.source.name,
              publishedAt: article.publishedAt,
              category: this.categorizeInsight(article.title + ' ' + article.description),
              image: article.urlToImage
            })));
          }
        } catch (queryError) {
          console.warn(`Error with query "${query}":`, queryError.message);
          continue;
        }
      }

      return insights;
    } catch (error) {
      console.error(`Error getting news-based insights for ${ticker}:`, error.message);
      return [];
    }
  }

  // Get company news from Finnhub
  async getFinnhubCompanyNews(ticker) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        .toISOString().split('T')[0];

      const response = await axios.get(
        `https://finnhub.io/api/v1/company-news?symbol=${ticker}&from=${lastWeek}&to=${today}&token=${this.finnhubKey}`
      );

      return response.data.map(article => ({
        type: 'finnhub_news',
        ticker,
        title: article.headline,
        summary: article.summary || 'No summary available',
        source_url: article.url,
        source: article.source,
        publishedAt: new Date(article.datetime * 1000).toISOString(),
        category: this.categorizeInsight(article.headline + ' ' + article.summary),
        image: article.image
      }));
    } catch (error) {
      console.warn(`Error getting Finnhub news for ${ticker}:`, error.message);
      return [];
    }
  }

  // Get basic company profile
  async getCompanyProfile(ticker) {
    try {
      const response = await axios.get(
        `https://finnhub.io/api/v1/stock/profile2?symbol=${ticker}&token=${this.finnhubKey}`
      );

      return {
        name: response.data.name,
        industry: response.data.finnhubIndustry,
        sector: response.data.sector,
        country: response.data.country,
        marketCap: response.data.marketCapitalization,
        employees: response.data.employeeTotal,
        description: response.data.description
      };
    } catch (error) {
      console.warn(`Error getting company profile for ${ticker}:`, error.message);
      return null;
    }
  }

  // Analyze and combine data from all sources
  analyzeAndCombineData({ ticker, newsInsights, finnhubNews, companyProfile }) {
    const allInsights = [...newsInsights, ...finnhubNews];
    
    // Remove duplicates and sort by relevance
    const uniqueInsights = allInsights.filter((insight, index, self) =>
      index === self.findIndex(i => i.title === insight.title)
    );

    // Score and rank insights
    const scoredInsights = uniqueInsights.map(insight => ({
      ...insight,
      relevance_score: this.calculateRelevanceScore(insight),
      sentiment: this.analyzeSentiment(insight.title + ' ' + insight.summary),
      impact_score: this.calculateImpactScore(insight),
      filing_type: 'News Analysis',
      created_at: new Date().toISOString(),
      confidence_score: 0.8 // Higher confidence for news-based insights
    }));

    // Sort by relevance and impact
    return scoredInsights.sort((a, b) => 
      (b.relevance_score + b.impact_score) - (a.relevance_score + a.impact_score)
    );
  }

  // Calculate relevance score based on boardroom keywords
  calculateRelevanceScore(insight) {
    const text = (insight.title + ' ' + insight.summary).toLowerCase();
    const boardroomKeywords = {
      'ceo': 10, 'chief executive': 10, 'cfo': 8, 'chief financial': 8,
      'management': 6, 'executive': 7, 'board': 8, 'director': 6,
      'earnings': 9, 'guidance': 8, 'strategy': 7, 'acquisition': 9,
      'merger': 9, 'restructuring': 8, 'leadership': 7, 'succession': 8,
      'appointment': 6, 'resign': 7, 'hire': 6, 'promote': 5
    };

    let score = 0;
    Object.entries(boardroomKeywords).forEach(([keyword, weight]) => {
      if (text.includes(keyword)) {
        score += weight;
      }
    });

    return Math.min(score, 100); // Cap at 100
  }

  // Analyze sentiment
  analyzeSentiment(text) {
    const positiveWords = ['growth', 'increase', 'profit', 'strong', 'beat', 'exceed', 'success', 'positive', 'gain', 'up'];
    const negativeWords = ['loss', 'decline', 'drop', 'miss', 'weak', 'concern', 'negative', 'down', 'fall', 'risk'];
    
    const lowerText = text.toLowerCase();
    const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
    
    if (positiveCount > negativeCount) return 'bullish';
    if (negativeCount > positiveCount) return 'bearish';
    return 'neutral';
  }

  // Calculate impact score
  calculateImpactScore(insight) {
    const text = (insight.title + ' ' + insight.summary).toLowerCase();
    const highImpactTerms = ['acquisition', 'merger', 'ceo', 'earnings', 'guidance', 'restructuring'];
    const mediumImpactTerms = ['executive', 'management', 'strategy', 'appointment', 'board'];
    
    let score = 30; // Base score
    
    highImpactTerms.forEach(term => {
      if (text.includes(term)) score += 20;
    });
    
    mediumImpactTerms.forEach(term => {
      if (text.includes(term)) score += 10;
    });
    
    return Math.min(score, 100); // Cap at 100
  }

  // Categorize insights
  categorizeInsight(text) {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('earnings') || lowerText.includes('revenue') || lowerText.includes('profit')) {
      return 'Financial Results';
    } else if (lowerText.includes('ceo') || lowerText.includes('cfo') || lowerText.includes('executive')) {
      return 'Executive Changes';
    } else if (lowerText.includes('acquisition') || lowerText.includes('merger')) {
      return 'M&A Activity';
    } else if (lowerText.includes('guidance') || lowerText.includes('outlook')) {
      return 'Forward Guidance';
    } else if (lowerText.includes('strategy') || lowerText.includes('restructuring')) {
      return 'Strategic Changes';
    }
    
    return 'General Corporate';
  }

  // Fallback insights when APIs fail
  getFallbackInsights(ticker) {
    return [{
      ticker,
      title: `${ticker} Corporate Intelligence Monitoring`,
      summary: `Active monitoring of ${ticker} boardroom activities and executive decisions. Real-time analysis will resume when data sources are available.`,
      filing_type: 'System Status',
      sentiment: 'neutral',
      impact_score: 0,
      confidence_score: 0,
      source_url: null,
      created_at: new Date().toISOString(),
      category: 'System Notice'
    }];
  }

  // Get trending boardroom topics across multiple companies
  async getTrendingBoardroomTopics(tickers = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA']) {
    try {
      const allInsights = [];
      
      for (const ticker of tickers.slice(0, 3)) { // Limit to avoid rate limits
        const insights = await this.getBoardroomIntelligence(ticker, 3);
        allInsights.push(...insights);
      }

      // Analyze trending topics
      const topicCounts = {};
      allInsights.forEach(insight => {
        const topic = insight.category || 'General';
        topicCounts[topic] = (topicCounts[topic] || 0) + 1;
      });

      const trendingTopics = Object.entries(topicCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([topic, count]) => ({ topic, count }));

      return {
        trending_topics: trendingTopics,
        total_insights: allInsights.length,
        last_updated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting trending boardroom topics:', error.message);
      return { trending_topics: [], total_insights: 0, last_updated: new Date().toISOString() };
    }
  }
}

module.exports = EnhancedBoardroomIntelligence;