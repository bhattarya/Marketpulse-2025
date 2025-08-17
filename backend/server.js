require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const cron = require('node-cron');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');

// Import Phase 3 Intelligence Services
const database = require('./mongoDatabase'); // Changed to MongoDB
const SECDataService = require('./secData');
const AIAnalysisService = require('./aiAnalysis');
const GeoEventsService = require('./geoEvents');
const EnhancedBoardroomIntelligence = require('./enhancedBoardroomIntelligence');
const CrossMarketCorrelationEngine = require('./correlationEngine');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Phase 3 Services
const secService = new SECDataService();
const aiService = new AIAnalysisService();
const geoService = new GeoEventsService();
const enhancedBoardroomService = new EnhancedBoardroomIntelligence();
const correlationEngine = new CrossMarketCorrelationEngine();

// Initialize database
database.initialize().catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});

// === API Caches ===
let stockCache = {};
let stockCacheTime = {};
let cryptoCache = null;
let cryptoCacheTime = 0;
let newsCache = {};
let newsCacheTime = {};

// === AI Clients ===
const genAI = process.env.GOOGLE_API_KEY
  ? new GoogleGenerativeAI(process.env.GOOGLE_API_KEY)
  : null;

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

async function summarizeWithGemini(articles, ticker = "") {
  if (!genAI) throw new Error("Missing GOOGLE_API_KEY");

  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || "gemini-2.0-flash-exp"
  });

  const prompt = `
You are an expert financial analyst summarizing market news. Keep ALL responses very short and concise.
Context: Analyzing financial news articles for market insights.

IMPORTANT: Keep every response to ONE SHORT SENTENCE maximum (under 15 words).

For each article, provide:
1. Summary: One short sentence about the main news point
2. Sentiment: Positive, Negative, or Neutral (based on market implications)
3. Impact: One short sentence about potential market impact
4. Key_Metrics: Only extract specific numbers/percentages mentioned (or "None")

IMPORTANT: Analyze each article independently based on its own content, not just the search context.

Articles to analyze:
${articles.map((a, i) => `[${i + 1}]
Title: ${a.title || ""}
Description: ${a.description || ""}`).join("\n\n")}

Respond in this exact format for each article:
[1]
Summary: [One short sentence under 15 words about the article's main point]
Sentiment: [Positive/Negative/Neutral]
Impact: [One short sentence under 15 words about market impact]
Key_Metrics: [Specific numbers/percentages only or "None"]

[2]
Summary: [One short sentence under 15 words about the article's main point]
Sentiment: [Positive/Negative/Neutral]
Impact: [One short sentence under 15 words about market impact]
Key_Metrics: [Specific numbers/percentages only or "None"]
`;

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }]
  });

  const text = result.response.text();
  const blocks = text.split(/\[\d+\]/).slice(1);

  return articles.map((article, i) => {
    const block = blocks[i] || "";
    const sumMatch = block.match(/Summary:\s*([\s\S]*?)(?=\nSentiment:|\nImpact:|\n\[|\Z)/i);
    const sentMatch = block.match(/Sentiment:\s*(Positive|Negative|Neutral)/i);
    const impactMatch = block.match(/Impact:\s*([\s\S]*?)(?=\nKey_Metrics:|\n\[|\Z)/i);
    const metricsMatch = block.match(/Key_Metrics:\s*([\s\S]*?)(?=\n\[|\Z)/i);

    return {
      title: article.title,
      url: article.url,
      image: article.urlToImage,
      source: article.source?.name || article.source || "Unknown",
      summary: sumMatch ? sumMatch[1].trim() : article.description || "No summary available",
      sentiment: sentMatch ? sentMatch[1] : "Neutral",
      impact: impactMatch ? impactMatch[1].trim() : "Market impact assessment unavailable",
      key_metrics: metricsMatch ? metricsMatch[1].trim() : "No specific metrics mentioned",
      publishedAt: article.publishedAt || null,
      ai_enhanced: true
    };
  });
}

// === Crypto Route ===
app.get("/api/crypto", async (req, res) => {
  try {
    const now = Date.now();
    if (cryptoCache && now - cryptoCacheTime < 60000) {
      return res.json(cryptoCache);
    }
    const url = `${process.env.COINGECKO_BASE}/coins/markets?vs_currency=usd&ids=bitcoin,ethereum`;
    const { data } = await axios.get(url);

    cryptoCache = data;
    cryptoCacheTime = now;
    res.json(data);
  } catch (err) {
    console.error("Crypto API Error:", err.message);
    res.status(500).json({ error: "Error fetching crypto data" });
  }
});

// === Search Route (Finnhub Symbol Lookup) ===
app.get("/api/search", async (req, res) => {
  try {
    const query = req.query.q;
    if (!query || query.length < 2) {
      return res.json([]);
    }

    // Search using Finnhub symbol lookup
    const url = `https://finnhub.io/api/v1/search?q=${encodeURIComponent(query)}&token=${process.env.FINNHUB_KEY}`;
    const { data } = await axios.get(url);

    if (data && data.result) {
      const results = data.result.slice(0, 10).map(item => ({
        symbol: item.symbol,
        name: item.description,
        type: item.type === 'Common Stock' ? 'stock' : 'crypto'
      }));
      res.json(results);
    } else {
      res.json([]);
    }
  } catch (err) {
    console.error("Search API Error:", err.message);
    res.json([]);
  }
});

// === Stocks Route ===
app.get("/api/stocks", async (req, res) => {
  try {
    const symbol = (req.query.symbol || "AAPL").toUpperCase();
    const now = Date.now();
    if (stockCache[symbol] && now - stockCacheTime[symbol] < 60000) {
      return res.json(stockCache[symbol]);
    }

    // Try Yahoo Finance API first (no key needed)
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;
      const { data } = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (data && data.chart && data.chart.result && data.chart.result[0]) {
        const result = data.chart.result[0];
        const quote = result.meta;
        const indicators = result.indicators.quote[0];
        
        if (quote && quote.regularMarketPrice) {
          const formatted = {
            symbol,
            price: quote.regularMarketPrice,
            change: quote.regularMarketPrice - quote.previousClose,
            changePercent: ((quote.regularMarketPrice - quote.previousClose) / quote.previousClose) * 100,
            high: quote.regularMarketDayHigh,
            low: quote.regularMarketDayLow,
            open: indicators.open ? indicators.open[indicators.open.length - 1] : quote.regularMarketPrice,
            prevClose: quote.previousClose,
            volume: quote.regularMarketVolume,
            source: 'yahoo'
          };

          stockCache[symbol] = formatted;
          stockCacheTime[symbol] = now;
          return res.json(formatted);
        }
      }
    } catch (yahooError) {
      console.warn(`Yahoo Finance API failed for ${symbol}, trying Finnhub...`);
    }

    // Try Finnhub API as backup
    try {
      const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${process.env.FINNHUB_KEY}`;
      const { data } = await axios.get(url);

      if (data && data.c) {
        const formatted = {
          symbol,
          price: data.c,
          change: data.d,
          changePercent: data.dp,
          high: data.h,
          low: data.l,
          open: data.o,
          prevClose: data.pc,
          source: 'finnhub'
        };

        stockCache[symbol] = formatted;
        stockCacheTime[symbol] = now;
        return res.json(formatted);
      }
    } catch (finnhubError) {
      console.warn(`Finnhub API also failed for ${symbol}, trying Alpha Vantage...`);
    }

    // Try Alpha Vantage as final backup
    if (process.env.ALPHA_VANTAGE_KEY) {
      try {
        const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${process.env.ALPHA_VANTAGE_KEY}`;
        const { data } = await axios.get(url);
        
        if (data && data['Global Quote']) {
          const quote = data['Global Quote'];
          const formatted = {
            symbol,
            price: parseFloat(quote['05. price']),
            change: parseFloat(quote['09. change']),
            changePercent: parseFloat(quote['10. change percent'].replace('%', '')),
            high: parseFloat(quote['03. high']),
            low: parseFloat(quote['04. low']),
            open: parseFloat(quote['02. open']),
            prevClose: parseFloat(quote['08. previous close']),
            source: 'alphavantage'
          };

          stockCache[symbol] = formatted;
          stockCacheTime[symbol] = now;
          return res.json(formatted);
        }
      } catch (alphaError) {
        console.warn(`Alpha Vantage API also failed for ${symbol}`);
      }
    }

    // If cache exists, return it
    if (stockCache[symbol]) {
      return res.json(stockCache[symbol]);
    }

    // If no valid API and no cache, throw error to trigger fallback
    throw new Error('All stock APIs failed');
  } catch (err) {
    console.error(`Stocks API Error for ${req.query.symbol}:`, err.message);
    if (stockCache[req.query.symbol?.toUpperCase()]) {
      return res.json(stockCache[req.query.symbol.toUpperCase()]);
    }
    
    res.status(500).json({ 
      error: "Stock data unavailable",
      message: "Please check API configuration",
      symbol: req.query.symbol || "AAPL"
    });
  }
});

// === Dashboard News Route (NewsData.io + Gemini) ===
app.get("/api/news/dashboard", async (req, res) => {
  try {
    const ticker = (req.query.ticker || "stock market").toUpperCase();
    const now = Date.now();
    const cacheKey = `dashboard_news_${ticker}`;
    if (newsCache[cacheKey] && now - newsCacheTime[cacheKey] < 300000) {
      return res.json(newsCache[cacheKey]);
    }

    let articles = [];

    // Try NewsData.io API first (for dashboard) - get general financial news
    try {
      const keywords = ['stock market', 'NYSE', 'NASDAQ', 'crypto', 'bitcoin', 'ethereum', 'S&P 500', 'earnings', 'IPO'];
      const randomKeyword = keywords[Math.floor(Math.random() * keywords.length)];
      const newsDataUrl = `https://newsdata.io/api/1/news?apikey=${process.env.NEWSDATA_API_KEY}&q=${encodeURIComponent(randomKeyword)}&language=en&category=business&size=8`;
      const newsRes = await axios.get(newsDataUrl);
      
      if (newsRes.data && newsRes.data.results) {
        articles = newsRes.data.results.map(article => ({
          title: article.title,
          url: article.link,
          urlToImage: article.image_url,
          source: { name: article.source_id || 'NewsData.io' },
          description: article.description || article.content || '',
          publishedAt: article.pubDate
        }));
        console.log(`Found ${articles.length} general market articles from NewsData.io`);
      }
    } catch (err) {
      console.warn("NewsData.io failed, falling back to NewsAPI...");
      
      // Fallback to NewsAPI with general business terms
      try {
        const businessTerms = ['stock market', 'earnings', 'nasdaq', 'bitcoin'];
        const randomTerm = businessTerms[Math.floor(Math.random() * businessTerms.length)];
        const newsRes = await axios.get(
          `https://newsapi.org/v2/everything?q=${encodeURIComponent(randomTerm)}&language=en&sortBy=publishedAt&pageSize=8&apiKey=${process.env.NEWS_API_KEY}`
        );
        articles = newsRes.data.articles || [];
        console.log(`Found ${articles.length} general market articles from NewsAPI fallback`);
      } catch (newsApiErr) {
        console.warn("NewsAPI also failed for dashboard");
      }
    }

    // If no articles found, provide fallback news
    if (!articles.length) {
      const fallbackNews = [
        {
          title: `${ticker} Market Analysis - Live Updates`,
          url: '#',
          urlToImage: null,
          source: { name: 'MarketPulse Intelligence' },
          description: `Monitoring ${ticker} market sentiment and trading activity.`,
          publishedAt: new Date().toISOString()
        },
        {
          title: `${ticker} Technical Indicators Update`,
          url: '#',
          urlToImage: null,
          source: { name: 'MarketPulse Technical' },
          description: `Technical analysis shows ongoing ${ticker} market dynamics.`,
          publishedAt: new Date(Date.now() - 3600000).toISOString()
        }
      ];
      
      articles = fallbackNews;
      console.log(`Using fallback news for dashboard ${ticker}`);
    }

    // Apply Gemini AI analysis
    let summaries;
    try {
      console.log(`Using Gemini AI to analyze ${articles.length} dashboard articles for ${ticker}`);
      summaries = await summarizeWithGemini(articles, ticker);
    } catch (err) {
      console.error("Gemini Error for dashboard:", err.message);
      summaries = articles.map(a => ({
        title: a.title,
        url: a.url,
        image: a.urlToImage,
        source: a.source?.name || a.source || "Unknown",
        summary: a.description || "No summary available",
        sentiment: "Neutral",
        impact: "AI analysis unavailable",
        key_metrics: "None",
        publishedAt: a.publishedAt || null,
        ai_enhanced: false
      }));
    }

    newsCache[cacheKey] = summaries;
    newsCacheTime[cacheKey] = now;
    res.json(summaries);
  } catch (error) {
    console.error("Dashboard News Route Error:", error.message);
    res.status(500).json({ error: "Failed to fetch dashboard news" });
  }
});

// === News Route (Multiple Sources + Gemini) ===
app.get("/api/news", async (req, res) => {
  try {
    const ticker = (req.query.ticker || "stock market").toUpperCase();
    const now = Date.now();
    if (newsCache[ticker] && now - newsCacheTime[ticker] < 300000) {
      return res.json(newsCache[ticker]);
    }

    let articles = [];

    // Try NewsAPI first (with Gemini integration)
    try {
      const newsRes = await axios.get(
        `https://newsapi.org/v2/everything?q=${encodeURIComponent(ticker)}&language=en&sortBy=publishedAt&pageSize=6&apiKey=${process.env.NEWS_API_KEY}`
      );
      articles = newsRes.data.articles || [];
      console.log(`Found ${articles.length} articles from NewsAPI`);
    } catch (err) {
      console.warn("NewsAPI failed, falling back to Yahoo Finance RSS...");
      
      // Try Yahoo Finance RSS as backup
      try {
        const rssUrl = `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${ticker}&region=US&lang=en-US`;
        const rssRes = await axios.get(rssUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        // Parse RSS (basic extraction)
        const items = rssRes.data.match(/<item>[\s\S]*?<\/item>/g) || [];
        articles = items.slice(0, 5).map(item => {
          const title = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] || 
                       item.match(/<title>(.*?)<\/title>/)?.[1] || 'No title';
          const url = item.match(/<link>(.*?)<\/link>/)?.[1] || '#';
          const description = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1] || 
                             item.match(/<description>(.*?)<\/description>/)?.[1] || 'No description';
          const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || null;
          
          return {
            title: title.replace(/&amp;/g, '&').replace(/&quot;/g, '"'),
            url,
            urlToImage: null,
            source: { name: 'Yahoo Finance' },
            description: description.replace(/<[^>]*>/g, '').substring(0, 200),
            publishedAt: pubDate ? new Date(pubDate).toISOString() : null
          };
        });
        
        if (articles.length > 0) {
          console.log(`Found ${articles.length} articles from Yahoo Finance RSS`);
        }
      } catch (yahooError) {
        console.warn("Yahoo Finance RSS also failed, trying Finnhub...");
        
        // Try Finnhub as final backup
        try {
          const today = new Date().toISOString().split("T")[0];
          const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0];
          const finnhubRes = await axios.get(
            `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(ticker)}&from=${lastWeek}&to=${today}&token=${process.env.FINNHUB_KEY}`
          );
          articles = finnhubRes.data.map(a => ({
            title: a.headline,
            url: a.url,
            urlToImage: a.image,
            source: { name: a.source },
            description: a.summary,
            publishedAt: a.datetime ? new Date(a.datetime * 1000).toISOString() : null
          }));
          console.log(`Found ${articles.length} articles from Finnhub`);
        } catch (finnhubError) {
          console.warn("Finnhub also failed, using fallback news...");
        }
      }
    }

    // If no articles found from any API, provide fallback news
    if (!articles.length) {
      const fallbackNews = [
        {
          title: `${ticker} Market Analysis - Live Updates`,
          url: '#',
          urlToImage: null,
          source: { name: 'MarketPulse Intelligence' },
          description: `Monitoring ${ticker} market sentiment and trading activity.`,
          publishedAt: new Date().toISOString()
        },
        {
          title: `${ticker} Technical Indicators Update`,
          url: '#',
          urlToImage: null,
          source: { name: 'MarketPulse Technical' },
          description: `Technical analysis shows ongoing ${ticker} market dynamics.`,
          publishedAt: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
        }
      ];
      
      articles = fallbackNews;
      console.log(`Using fallback news for ${ticker}`);
    }

    let summaries;
    try {
      console.log(`Using Gemini AI to analyze ${articles.length} articles for ${ticker}`);
      summaries = await summarizeWithGemini(articles, ticker);
    } catch (err) {
      console.error("Gemini Error:", err.message);
      summaries = articles.map(a => ({
        title: a.title,
        url: a.url,
        image: a.urlToImage,
        source: a.source?.name || a.source || "Unknown",
        summary: a.description || "No summary available",
        sentiment: "Neutral",
        impact: "AI analysis unavailable",
        key_metrics: "None",
        publishedAt: a.publishedAt || null,
        ai_enhanced: false
      }));
    }

    newsCache[ticker] = summaries;
    newsCacheTime[ticker] = now;
    res.json(summaries);
  } catch (error) {
    console.error("News Route Error:", error.message);
    res.status(500).json({ error: "Failed to fetch news" });
  }
});

// === PHASE 3: BOARDROOM INTELLIGENCE API ===
app.get("/api/boardroom", async (req, res) => {
  try {
    const ticker = (req.query.ticker || 'AAPL').toUpperCase();
    const limit = parseInt(req.query.limit) || 10;
    
    // Check cache first
    const cacheKey = `boardroom_${ticker}_${limit}`;
    const cached = await database.getFromCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }
    
    // Try to get existing insights from database
    let insights = await database.getBoardroomInsights(limit, ticker);
    
    // If no recent insights, generate new ones using enhanced service
    if (insights.length === 0) {
      try {
        console.log(`Generating enhanced boardroom intelligence for ${ticker}`);
        
        // Use enhanced boardroom intelligence service
        const enhancedInsights = await enhancedBoardroomService.getBoardroomIntelligence(ticker, limit);
        
        // Save insights to database
        for (const insight of enhancedInsights) {
          try {
            const insertId = await database.saveBoardroomInsight(insight);
            console.log(`Saved enhanced boardroom insight ${insertId} for ${ticker}`);
          } catch (saveError) {
            console.warn('Error saving insight:', saveError.message);
          }
        }
        
        insights = enhancedInsights;
      } catch (enhancedError) {
        console.error(`Enhanced boardroom intelligence error for ${ticker}:`, enhancedError.message);
        
        // Fallback to basic insight
        insights = [{
          ticker,
          title: `${ticker} Boardroom Intelligence`,
          summary: `Monitoring ${ticker} executive activities and corporate developments. Enhanced analysis will be available when data sources are accessible.`,
          key_points: ['Real-time boardroom monitoring active', 'Executive decision tracking enabled'],
          sentiment: 'neutral',
          impact_score: 50,
          confidence_score: 0.7,
          filing_type: 'Enhanced Analysis',
          created_at: new Date().toISOString()
        }];
      }
    }
    
    // Cache the result
    await database.setCache(cacheKey, insights, 30); // 30-minute cache
    
    res.json(insights);
  } catch (error) {
    console.error("Boardroom API Error:", error.message);
    res.status(500).json({ 
      error: "Error fetching boardroom intelligence",
      ticker: req.query.ticker 
    });
  }
});

// === ENHANCED BOARDROOM TRENDING TOPICS API ===
app.get("/api/boardroom/trending", async (req, res) => {
  try {
    const tickers = (req.query.tickers || 'AAPL,MSFT,GOOGL,TSLA,NVDA').split(',');
    
    // Check cache first
    const cacheKey = `boardroom_trending_${tickers.join('_')}`;
    const cached = await database.getFromCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }
    
    // Get trending boardroom topics
    const trendingData = await enhancedBoardroomService.getTrendingBoardroomTopics(tickers);
    
    // Cache the result for 1 hour
    await database.setCache(cacheKey, trendingData, 60);
    
    res.json(trendingData);
  } catch (error) {
    console.error("Boardroom Trending API Error:", error.message);
    res.status(500).json({ 
      error: "Error fetching trending boardroom topics" 
    });
  }
});

// === PHASE 3: GEO-EVENTS RISK ANALYZER API ===
app.get("/api/geo-events", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const alertsOnly = req.query.alerts === 'true';
    
    // Check cache first
    const cacheKey = `geo_events_${limit}_${alertsOnly}`;
    const cached = await database.getFromCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }
    
    // Get existing events from database
    let events = await database.getGeoEvents(limit, alertsOnly);
    
    // If no recent events, fetch and analyze new ones
    if (events.length < 5) {
      try {
        console.log('Fetching new geo-political events');
        
        // Monitor for new events
        const rawEvents = await geoService.monitorGeoEvents();
        
        // Analyze each event with AI
        const analyzedEvents = [];
        for (const rawEvent of rawEvents.slice(0, 10)) {
          try {
            const analysis = await aiService.analyzeGeoEvent(rawEvent);
            const insertId = await database.saveGeoEvent(analysis);
            analyzedEvents.push({ ...analysis, id: insertId });
            
            // Rate limiting between AI calls
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (eventError) {
            console.warn('Error analyzing geo event:', eventError.message);
            continue;
          }
        }
        
        console.log(`Analyzed and saved ${analyzedEvents.length} geo events`);
        events = [...analyzedEvents, ...events].slice(0, limit);
      } catch (monitorError) {
        console.error('Geo events monitoring error:', monitorError.message);
      }
    }
    
    // Cache the result
    await database.setCache(cacheKey, events, 15); // 15-minute cache
    
    res.json(events);
  } catch (error) {
    console.error("Geo Events API Error:", error.message);
    res.status(500).json({ 
      error: "Error fetching geo-political events" 
    });
  }
});

// === PHASE 3: INTELLIGENCE DASHBOARD API ===
app.get("/api/intelligence", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    
    // Check cache first
    const cacheKey = `intelligence_dashboard_${limit}`;
    const cached = await database.getFromCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }
    
    // Get top insights from both boardroom and geo events
    const [boardroomInsights, geoEvents, alerts] = await Promise.all([
      database.getBoardroomInsights(limit),
      database.getGeoEvents(limit, false),
      database.getGeoEvents(5, true) // Get top 5 alerts
    ]);
    
    // Combine and sort by impact/risk scores
    const allInsights = [
      ...boardroomInsights.map(insight => ({
        ...insight,
        type: 'boardroom',
        score: insight.impact_score || 0
      })),
      ...geoEvents.map(event => ({
        ...event,
        type: 'geo-event',
        score: event.risk_score || 0
      }))
    ].sort((a, b) => b.score - a.score).slice(0, limit);
    
    const response = {
      topInsights: allInsights,
      alerts: alerts,
      summary: {
        totalInsights: boardroomInsights.length + geoEvents.length,
        activeAlerts: alerts.length,
        lastUpdated: new Date().toISOString()
      }
    };
    
    // Cache for 10 minutes
    await database.setCache(cacheKey, response, 10);
    
    res.json(response);
  } catch (error) {
    console.error("Intelligence Dashboard API Error:", error.message);
    res.status(500).json({ 
      error: "Error fetching intelligence dashboard data" 
    });
  }
});

// === CROSS-MARKET CORRELATION ANALYSIS API ===
app.post("/api/correlation/analyze", async (req, res) => {
  try {
    const { asset1, asset2, timeframe = 30 } = req.body;
    
    if (!asset1 || !asset2) {
      return res.status(400).json({ error: 'Both asset1 and asset2 are required' });
    }
    
    // Validate asset structure
    if (!asset1.symbol || !asset1.type || !asset2.symbol || !asset2.type) {
      return res.status(400).json({ error: 'Assets must have symbol and type properties' });
    }
    
    // Check cache first
    const cacheKey = `correlation_${asset1.symbol}_${asset2.symbol}_${timeframe}`;
    const cached = await database.getFromCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }
    
    console.log(`Analyzing correlation: ${asset1.symbol} (${asset1.type}) vs ${asset2.symbol} (${asset2.type})`);
    
    // Perform correlation analysis
    const correlation = await correlationEngine.analyzeCorrelation(asset1, asset2, timeframe);
    
    // Cache the result for 1 hour
    await database.setCache(cacheKey, correlation, 60);
    
    res.json(correlation);
  } catch (error) {
    console.error("Correlation Analysis API Error:", error.message);
    res.status(500).json({ 
      error: "Error performing correlation analysis",
      details: error.message 
    });
  }
});

// === MULTIPLE CORRELATIONS API ===
app.post("/api/correlation/multiple", async (req, res) => {
  try {
    const { assets, timeframe = 30 } = req.body;
    
    if (!assets || !Array.isArray(assets) || assets.length < 2) {
      return res.status(400).json({ error: 'At least 2 assets are required' });
    }
    
    if (assets.length > 6) {
      return res.status(400).json({ error: 'Maximum 6 assets allowed to avoid excessive processing' });
    }
    
    // Check cache first
    const assetKey = assets.map(a => `${a.symbol}-${a.type}`).sort().join('_');
    const cacheKey = `multi_correlation_${assetKey}_${timeframe}`;
    const cached = await database.getFromCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }
    
    console.log(`Analyzing multiple correlations for ${assets.length} assets`);
    
    // Perform multiple correlation analysis
    const correlations = await correlationEngine.analyzeMultipleCorrelations(assets, timeframe);
    
    // Cache the result for 1 hour
    await database.setCache(cacheKey, correlations, 60);
    
    res.json(correlations);
  } catch (error) {
    console.error("Multiple Correlation Analysis API Error:", error.message);
    res.status(500).json({ 
      error: "Error performing multiple correlation analysis",
      details: error.message 
    });
  }
});

// === PRESET CORRELATION ANALYSIS API ===
app.get("/api/correlation/presets/:preset", async (req, res) => {
  try {
    const { preset } = req.params;
    const { timeframe = 30 } = req.query;
    
    // Define preset asset combinations
    const presets = {
      'tech-crypto': [
        { symbol: 'AAPL', type: 'stock', name: 'Apple' },
        { symbol: 'TSLA', type: 'stock', name: 'Tesla' },
        { symbol: 'BTC', type: 'crypto', name: 'Bitcoin' },
        { symbol: 'ETH', type: 'crypto', name: 'Ethereum' }
      ],
      'market-leaders': [
        { symbol: 'AAPL', type: 'stock', name: 'Apple' },
        { symbol: 'MSFT', type: 'stock', name: 'Microsoft' },
        { symbol: 'GOOGL', type: 'stock', name: 'Google' },
        { symbol: 'NVDA', type: 'stock', name: 'NVIDIA' }
      ],
      'crypto-majors': [
        { symbol: 'BTC', type: 'crypto', name: 'Bitcoin' },
        { symbol: 'ETH', type: 'crypto', name: 'Ethereum' },
        { symbol: 'ADA', type: 'crypto', name: 'Cardano' }
      ]
    };
    
    if (!presets[preset]) {
      return res.status(404).json({ error: `Preset '${preset}' not found` });
    }
    
    // Check cache first
    const cacheKey = `preset_correlation_${preset}_${timeframe}`;
    const cached = await database.getFromCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }
    
    console.log(`Analyzing preset correlation: ${preset}`);
    
    // Perform analysis for preset
    const correlations = await correlationEngine.analyzeMultipleCorrelations(presets[preset], parseInt(timeframe));
    
    const result = {
      preset: preset,
      assets: presets[preset],
      ...correlations
    };
    
    // Cache the result for 30 minutes
    await database.setCache(cacheKey, result, 30);
    
    res.json(result);
  } catch (error) {
    console.error("Preset Correlation Analysis API Error:", error.message);
    res.status(500).json({ 
      error: "Error performing preset correlation analysis",
      details: error.message 
    });
  }
});

// === FED MEETING TRACKER ===
app.get("/api/intelligence/fed-tracker", async (req, res) => {
  try {
    const cacheKey = 'fed_tracker';
    const cached = newsCache[cacheKey];
    const now = Date.now();
    
    if (cached && now - newsCacheTime[cacheKey] < 3600000) { // 1 hour cache
      return res.json(cached);
    }

    if (!openai) {
      throw new Error("OpenAI API key not configured");
    }

    const prompt = `Generate detailed Federal Reserve meeting information for the last 3 meetings and upcoming meeting. Include:

1. Next scheduled FED meeting date (estimate based on typical 8 meetings per year)
2. Last 3 meetings with key decisions and discussions
3. Interest rate decisions and reasoning
4. Economic outlook discussions
5. Market impact assessments

Format as JSON:
{
  "nextMeeting": {
    "date": "2025-XX-XX",
    "type": "FOMC Meeting",
    "expectedTopics": ["topic1", "topic2", "topic3"]
  },
  "recentMeetings": [
    {
      "date": "2024-XX-XX",
      "decision": "Rate decision description",
      "keyDiscussions": ["discussion1", "discussion2"],
      "marketImpact": "impact description",
      "rateChange": "0.25% increase/decrease/hold"
    }
  ]
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2
    });

    let fedData = {};
    try {
      fedData = JSON.parse(completion.choices[0].message.content);
    } catch (parseError) {
      console.error("Failed to parse FED data:", parseError);
      fedData = {
        nextMeeting: {
          date: "2025-03-15",
          type: "FOMC Meeting",
          expectedTopics: ["Interest rates", "Economic outlook", "Inflation targets"]
        },
        recentMeetings: [
          {
            date: "2024-12-18",
            decision: "Rate cut by 0.25%",
            keyDiscussions: ["Economic stability", "Labor market"],
            marketImpact: "Positive market reaction",
            rateChange: "0.25% decrease"
          }
        ]
      };
    }

    newsCache[cacheKey] = fedData;
    newsCacheTime[cacheKey] = now;
    res.json(fedData);
  } catch (error) {
    console.error("FED Tracker API Error:", error.message);
    res.status(500).json({ error: "Failed to fetch FED data" });
  }
});

// === ECONOMIC INDICATORS API ===
app.get("/api/intelligence/economic-indicators", async (req, res) => {
  try {
    const cacheKey = 'economic_indicators';
    const cached = newsCache[cacheKey];
    const now = Date.now();
    
    if (cached && now - newsCacheTime[cacheKey] < 1800000) { // 30 min cache
      return res.json(cached);
    }

    if (!genAI) {
      throw new Error("Gemini API key not configured");
    }

    const prompt = `Provide current real-time economic indicators data for ${new Date().toDateString()}:

1. Current mortgage rates (nationwide average)
2. Oil prices (WTI and Brent crude)
3. Inflation rate (latest CPI data)
4. Brief analysis of each indicator's trend and market impact

Format as JSON only, no markdown:
{
  "mortgageRates": {
    "thirtyYear": "6.75%",
    "fifteenYear": "6.25%",
    "trend": "rising/falling/stable",
    "impact": "brief impact description"
  },
  "oilPrices": {
    "wti": "$75.50",
    "brent": "$78.20",
    "trend": "rising/falling/stable",
    "impact": "brief impact description"
  },
  "inflation": {
    "rate": "3.2%",
    "trend": "rising/falling/stable",
    "impact": "brief impact description",
    "target": "2.0%"
  },
  "lastUpdated": "${new Date().toISOString()}"
}`;

    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL });
    const result = await model.generateContent(prompt);

    let indicators = {};
    try {
      const responseText = result.response.text();
      // Clean any markdown formatting
      const cleanText = responseText.replace(/```json\n?|```\n?/g, '').trim();
      indicators = JSON.parse(cleanText);
    } catch (parseError) {
      console.error("Failed to parse economic indicators:", parseError);
      indicators = {
        mortgageRates: {
          thirtyYear: "6.75%",
          fifteenYear: "6.25%",
          trend: "stable",
          impact: "Elevated rates continue to impact housing market"
        },
        oilPrices: {
          wti: "$75.50",
          brent: "$78.20",
          trend: "stable",
          impact: "Oil prices affecting inflation and transportation costs"
        },
        inflation: {
          rate: "3.2%",
          trend: "falling",
          impact: "Above target but showing improvement",
          target: "2.0%"
        },
        lastUpdated: new Date().toISOString().split('T')[0]
      };
    }

    newsCache[cacheKey] = indicators;
    newsCacheTime[cacheKey] = now;
    res.json(indicators);
  } catch (error) {
    console.error("Economic Indicators API Error:", error.message);
    res.status(500).json({ error: "Failed to fetch economic indicators" });
  }
});

// === INTELLIGENCE PAGE - BIG TECH BOARD NEWS ===
app.get("/api/intelligence/tech-board", async (req, res) => {
  try {
    const cacheKey = 'tech_board_news';
    const cached = newsCache[cacheKey];
    const now = Date.now();
    
    if (cached && now - newsCacheTime[cacheKey] < 600000) { // 10 min cache
      return res.json(cached);
    }

    if (!openai) {
      throw new Error("OpenAI API key not configured");
    }

    // Get latest tech news from NewsData.io
    let techNews = [];
    try {
      const techCompanies = ['Apple', 'Microsoft', 'Google', 'Amazon', 'Meta', 'Tesla', 'NVIDIA', 'Netflix'];
      const randomCompany = techCompanies[Math.floor(Math.random() * techCompanies.length)];
      const newsDataUrl = `https://newsdata.io/api/1/news?apikey=${process.env.NEWSDATA_API_KEY}&q=${encodeURIComponent(randomCompany)}&language=en&category=business&size=10`;
      const newsRes = await axios.get(newsDataUrl);
      
      if (newsRes.data && newsRes.data.results) {
        techNews = newsRes.data.results.slice(0, 8);
      }
    } catch (newsError) {
      console.warn("Failed to fetch tech news from NewsData.io");
    }

    // Use OpenAI to analyze and categorize the news
    const prompt = `You are analyzing tech industry board news. For each article, provide a brief analysis focusing on:
1. Corporate governance impact
2. Board-level decisions
3. Executive changes
4. Strategic implications

Keep each analysis to 2-3 sentences maximum.

Articles:
${techNews.map((article, i) => `${i + 1}. ${article.title}\n${article.description || ''}`).join('\n\n')}

Respond in JSON format:
{
  "analyses": [
    {
      "title": "article title",
      "boardImpact": "brief board-level analysis",
      "category": "governance|strategy|executive|financial",
      "priority": "high|medium|low"
    }
  ]
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3
    });

    let analyses = [];
    try {
      const parsed = JSON.parse(completion.choices[0].message.content);
      analyses = parsed.analyses || [];
    } catch (parseError) {
      console.error("Failed to parse OpenAI response:", parseError);
    }

    // Combine with original articles
    const result = techNews.map((article, i) => ({
      title: article.title,
      url: article.link,
      image: article.image_url,
      source: article.source_id,
      publishedAt: article.pubDate,
      boardAnalysis: analyses[i] || {
        boardImpact: "Analysis unavailable",
        category: "general",
        priority: "medium"
      }
    }));

    newsCache[cacheKey] = result;
    newsCacheTime[cacheKey] = now;
    res.json(result);
  } catch (error) {
    console.error("Tech Board News API Error:", error.message);
    res.status(500).json({ error: "Failed to fetch tech board news" });
  }
});

// === MARKET METRICS API ===
app.get("/api/market-metrics", async (req, res) => {
  try {
    const cacheKey = 'market_metrics';
    const cached = newsCache[cacheKey];
    const now = Date.now();
    
    if (cached && now - newsCacheTime[cacheKey] < 300000) { // 5 min cache
      return res.json(cached);
    }

    const metrics = {};

    // Get Fear & Greed Index
    try {
      const fgResponse = await axios.get("https://api.alternative.me/fng/");
      metrics.fearGreed = fgResponse.data?.data?.[0] || null;
    } catch (error) {
      console.warn("Fear & Greed API failed");
      metrics.fearGreed = null;
    }

    // Get Global Market Cap from CoinGecko
    try {
      const globalResponse = await axios.get(`${process.env.COINGECKO_BASE}/global`);
      const globalData = globalResponse.data?.data;
      if (globalData) {
        metrics.totalMarketCap = globalData.total_market_cap?.usd || null;
        metrics.total24hVolume = globalData.total_volume?.usd || null;
        metrics.marketCapChange24h = globalData.market_cap_change_percentage_24h_usd || null;
      }
    } catch (error) {
      console.warn("CoinGecko global data failed");
    }

    // Get additional stock market data
    try {
      const spyResponse = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/SPY`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      });
      
      if (spyResponse.data?.chart?.result?.[0]) {
        const spyData = spyResponse.data.chart.result[0];
        const quote = spyData.meta;
        metrics.spyPrice = quote.regularMarketPrice;
        metrics.spyChange = ((quote.regularMarketPrice - quote.previousClose) / quote.previousClose) * 100;
      }
    } catch (error) {
      console.warn("SPY data failed");
    }

    newsCache[cacheKey] = metrics;
    newsCacheTime[cacheKey] = now;
    res.json(metrics);
  } catch (error) {
    console.error("Market Metrics API Error:", error.message);
    res.status(500).json({ error: "Failed to fetch market metrics" });
  }
});

// === GLOBAL TARIFF TRACKER ===
app.get("/api/intelligence/tariffs", async (req, res) => {
  try {
    const cacheKey = 'global_tariffs';
    const cached = newsCache[cacheKey];
    const now = Date.now();
    
    if (cached && now - newsCacheTime[cacheKey] < 1800000) { // 30 min cache
      return res.json(cached);
    }

    if (!openai) {
      throw new Error("OpenAI API key not configured");
    }

    const countries = ['CHINA', 'INDIA', 'JAPAN', 'UK', 'KOREA'];
    const tariffData = [];

    for (const country of countries) {
      const prompt = `Provide current market and trade information for ${country}. Focus on:
1. Recent tariff changes or trade policy updates
2. Top 5 market-related developments
3. Economic indicators affecting trade
4. Current trade tensions or agreements

Keep response concise and factual. Format as JSON:
{
  "country": "${country}",
  "tariffStatus": "brief overview of current tariff situation",
  "topDevelopments": [
    "development 1",
    "development 2",
    "development 3",
    "development 4",
    "development 5"
  ],
  "tradeImpact": "brief impact assessment",
  "lastUpdated": "current date"
}`;

      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.2
        });

        const parsed = JSON.parse(completion.choices[0].message.content);
        tariffData.push(parsed);
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Failed to get tariff data for ${country}:`, error);
        tariffData.push({
          country,
          tariffStatus: "Data unavailable",
          topDevelopments: ["Information not available"],
          tradeImpact: "Analysis unavailable",
          lastUpdated: new Date().toISOString()
        });
      }
    }

    newsCache[cacheKey] = tariffData;
    newsCacheTime[cacheKey] = now;
    res.json(tariffData);
  } catch (error) {
    console.error("Global Tariffs API Error:", error.message);
    res.status(500).json({ error: "Failed to fetch tariff data" });
  }
});

// === GLOBAL NEWS BY COUNTRY API ===
app.get("/api/news/global", async (req, res) => {
  try {
    const { country } = req.query;
    
    if (!country) {
      return res.status(400).json({ error: "Country parameter is required" });
    }

    const cacheKey = `global_news_${country}`;
    const now = Date.now();
    const cacheTimeout = 30 * 60 * 1000; // 30 minutes

    // Check cache
    if (newsCache[cacheKey] && (now - newsCacheTime[cacheKey]) < cacheTimeout) {
      return res.json(newsCache[cacheKey]);
    }

    let articles = [];

    // Try NewsData.io API first for global news
    if (process.env.NEWSDATA_API_KEY) {
      try {
        const countryCode = getCountryCode(country);
        const response = await axios.get(
          `https://newsdata.io/api/1/news?apikey=${process.env.NEWSDATA_API_KEY}&country=${countryCode}&category=business,politics&language=en&size=10`
        );
        
        if (response.data?.results) {
          articles = response.data.results.map(article => ({
            title: article.title,
            url: article.link || '#',
            urlToImage: article.image_url,
            source: article.source_id || 'NewsData',
            summary: article.description || article.content || 'No summary available',
            publishedAt: article.pubDate,
            country: country
          }));
          console.log(`Found ${articles.length} articles for ${country} from NewsData.io`);
        }
      } catch (error) {
        console.warn(`NewsData.io failed for ${country}:`, error.message);
      }
    }

    // Fallback to NewsAPI if NewsData.io fails
    if (articles.length === 0 && process.env.NEWS_API_KEY) {
      try {
        const countryCode = getNewsAPICountryCode(country);
        const response = await axios.get(
          `https://newsapi.org/v2/top-headlines?country=${countryCode}&category=business&pageSize=10&apiKey=${process.env.NEWS_API_KEY}`
        );
        
        if (response.data?.articles) {
          articles = response.data.articles.map(article => ({
            title: article.title,
            url: article.url || '#',
            urlToImage: article.urlToImage,
            source: article.source?.name || 'NewsAPI',
            summary: article.description || 'No summary available',
            publishedAt: article.publishedAt,
            country: country
          }));
          console.log(`Found ${articles.length} articles for ${country} from NewsAPI`);
        }
      } catch (error) {
        console.warn(`NewsAPI failed for ${country}:`, error.message);
      }
    }

    // If no articles found, provide fallback content
    if (articles.length === 0) {
      articles = getFallbackGlobalNews(country);
      console.log(`Using fallback news for ${country}`);
    }

    // Limit to top 8 articles
    articles = articles.slice(0, 8);

    newsCache[cacheKey] = articles;
    newsCacheTime[cacheKey] = now;
    res.json(articles);
  } catch (error) {
    console.error("Global News API Error:", error.message);
    res.status(500).json({ error: "Failed to fetch global news" });
  }
});

// Helper function to get country codes for NewsData.io
function getCountryCode(country) {
  const countryMap = {
    'CHINA': 'cn',
    'INDIA': 'in', 
    'JAPAN': 'jp',
    'UK': 'gb',
    'KOREA': 'kr'
  };
  return countryMap[country] || 'us';
}

// Helper function to get country codes for NewsAPI
function getNewsAPICountryCode(country) {
  const countryMap = {
    'CHINA': 'cn',
    'INDIA': 'in',
    'JAPAN': 'jp', 
    'UK': 'gb',
    'KOREA': 'kr'
  };
  return countryMap[country] || 'us';
}

// Helper function for fallback global news
function getFallbackGlobalNews(country) {
  const fallbackNews = {
    'CHINA': [
      {
        title: "China Economic Growth Indicators Show Resilient Performance",
        url: "#",
        urlToImage: null,
        source: "MarketPulse Global",
        summary: "Recent economic data from China indicates steady growth momentum in key sectors.",
        publishedAt: new Date().toISOString(),
        country: "CHINA"
      },
      {
        title: "Chinese Technology Sector Continues Innovation Drive",
        url: "#", 
        urlToImage: null,
        source: "MarketPulse Tech",
        summary: "Technology companies in China maintain focus on innovation and global expansion.",
        publishedAt: new Date(Date.now() - 3600000).toISOString(),
        country: "CHINA"
      }
    ],
    'INDIA': [
      {
        title: "India's Digital Economy Expansion Accelerates",
        url: "#",
        urlToImage: null,
        source: "MarketPulse Global",
        summary: "India continues to lead digital transformation initiatives across multiple sectors.",
        publishedAt: new Date().toISOString(),
        country: "INDIA"
      }
    ],
    'JAPAN': [
      {
        title: "Japan Manufacturing Sector Shows Strong Performance",
        url: "#",
        urlToImage: null,
        source: "MarketPulse Global", 
        summary: "Japanese manufacturing maintains competitive edge through technological advancement.",
        publishedAt: new Date().toISOString(),
        country: "JAPAN"
      }
    ],
    'UK': [
      {
        title: "UK Financial Services Sector Adapts to Global Changes",
        url: "#",
        urlToImage: null,
        source: "MarketPulse Global",
        summary: "London's financial district continues to innovate amid changing global dynamics.",
        publishedAt: new Date().toISOString(),
        country: "UK"
      }
    ],
    'KOREA': [
      {
        title: "South Korea Technology Exports Maintain Growth Trajectory",
        url: "#",
        urlToImage: null,
        source: "MarketPulse Global",
        summary: "Korean technology exports show resilience in global markets.",
        publishedAt: new Date().toISOString(),
        country: "KOREA"
      }
    ]
  };
  
  return fallbackNews[country] || [{
    title: `${country} Market Update`,
    url: "#",
    urlToImage: null,
    source: "MarketPulse Global",
    summary: `Latest market developments from ${country}.`,
    publishedAt: new Date().toISOString(),
    country: country
  }];
}

// === GEO-EVENT RISK ANALYZER API ===
app.get("/api/intelligence/geo-events", async (req, res) => {
  try {
    const cacheKey = 'geo_events_analyzer';
    const cached = newsCache[cacheKey];
    const now = Date.now();
    
    if (cached && now - newsCacheTime[cacheKey] < 1800000) { // 30 min cache
      return res.json(cached);
    }

    if (!genAI) {
      throw new Error("Gemini API key not configured");
    }

    const regions = ['USA', 'China', 'India', 'Europe', 'Global'];
    const geoEvents = [];

    for (const region of regions) {
      const prompt = `Analyze recent geopolitical events in ${region} that could impact financial markets:

1. Identify 2-3 key events affecting ${region}
2. Assess market impact risk level (High/Medium/Low)  
3. Explain how this could affect US/India/Global markets
4. Provide brief risk assessment

Format as JSON only, no markdown:
{
  "region": "${region}",
  "events": [
    {
      "title": "event title",
      "description": "brief description",
      "riskLevel": "High/Medium/Low",
      "marketImpact": "specific market impact explanation",
      "affectedSectors": ["sector1", "sector2"],
      "timeframe": "short-term/medium-term/long-term"
    }
  ],
  "overallRisk": "High/Medium/Low",
  "lastUpdated": "${new Date().toISOString()}"
}`;

      try {
        const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL });
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        const cleanText = responseText.replace(/```json\n?|```\n?/g, '').trim();
        const regionData = JSON.parse(cleanText);
        geoEvents.push(regionData);
        
        // Rate limiting for Gemini API
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Failed to get geo events for ${region}:`, error);
        geoEvents.push({
          region,
          events: [{
            title: `${region} Market Monitoring`,
            description: "Monitoring regional developments",
            riskLevel: "Medium",
            marketImpact: "General market volatility possible",
            affectedSectors: ["General Market"],
            timeframe: "ongoing"
          }],
          overallRisk: "Medium",
          lastUpdated: new Date().toISOString()
        });
      }
    }

    const responseData = {
      regions: geoEvents,
      summary: {
        totalEvents: geoEvents.reduce((acc, region) => acc + region.events.length, 0),
        highRiskRegions: geoEvents.filter(r => r.overallRisk === 'High').length,
        lastUpdated: new Date().toISOString()
      }
    };

    newsCache[cacheKey] = responseData;
    newsCacheTime[cacheKey] = now;
    res.json(responseData);
  } catch (error) {
    console.error("Geo-Events API Error:", error.message);
    res.status(500).json({ error: "Failed to fetch geo-event data" });
  }
});

// === AI CHATBOT WITH DEEPSEEK API ===
app.post("/api/chatbot/ask", async (req, res) => {
  try {
    const { message, ticker } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const deepseekApiKey = process.env.DEEPSEEK_API_KEY;
    if (!deepseekApiKey) {
      throw new Error("DeepSeek API key not configured");
    }

    let systemPrompt = `You are MarketPulse AI, a financial education and analysis assistant. Provide helpful, educational, and concise financial information.

For general questions: Answer with clear explanations, examples, and educational value.

For stock-specific questions: Use this format EXACTLY:
📌 Name – Full company name + ticker
📊 Current Market Status – Positive/Negative (based on recent trends)
📰 3 Important Headlines – Recent significant news
📈 Market Sentiment – Positive/Neutral/Negative
🏢 What the Company Does – Brief business description  
📘 Learn Stock Market – Educational insight related to the query

Keep responses concise and educational. Always end with "💡 Ask me anything about finance or specific stocks!"`;

    if (ticker) {
      systemPrompt += `\n\nThe user is asking about ${ticker.toUpperCase()}. Provide detailed analysis for this stock using the format above.`;
    }

    const deepseekResponse = await axios.post('https://api.deepseek.com/v1/chat/completions', {
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      temperature: 0.7,
      max_tokens: 1000
    }, {
      headers: {
        'Authorization': `Bearer ${deepseekApiKey}`,
        'Content-Type': 'application/json'
      }
    });

    const aiResponse = deepseekResponse.data.choices[0].message.content;

    // If this is a stock-specific query, also fetch recent news
    let stockNews = null;
    if (ticker) {
      try {
        const newsResponse = await fetchJSON(`http://localhost:5000/api/news?ticker=${ticker}`);
        stockNews = newsResponse.slice(0, 3);
      } catch (error) {
        console.warn('Failed to fetch stock news:', error);
      }
    }

    res.json({
      response: aiResponse,
      ticker: ticker || null,
      news: stockNews,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Chatbot API Error:", error.message);
    res.status(500).json({ 
      error: "Failed to process your question",
      response: "I'm sorry, I'm having trouble processing your request right now. Please try again in a moment. 💡 Ask me anything about finance or specific stocks!"
    });
  }
});

// === STOCK ANALYSIS CHATBOT ===
app.post("/api/chatbot/analyze-stock", async (req, res) => {
  try {
    const { ticker } = req.body;
    
    if (!ticker) {
      return res.status(400).json({ error: "Stock ticker is required" });
    }

    const deepseekApiKey = process.env.DEEPSEEK_API_KEY;
    if (!deepseekApiKey) {
      throw new Error("DeepSeek API key not configured");
    }

    // Fetch stock news first
    let stockNews = [];
    try {
      const newsResponse = await fetchJSON(`http://localhost:5000/api/news?ticker=${ticker}`);
      stockNews = newsResponse.slice(0, 3);
    } catch (error) {
      console.warn('Failed to fetch stock news:', error);
    }

    const headlines = stockNews.map(n => n.title).join('\n');

    const prompt = `Analyze ${ticker.toUpperCase()} stock and provide information in this EXACT format:

📌 Name – [Full company name + ticker]
📊 Current Market Status – [Positive/Negative based on recent trends]
📰 3 Important Headlines – 
1. [Headline 1]
2. [Headline 2] 
3. [Headline 3]
📈 Market Sentiment – [Positive/Neutral/Negative]
🏢 What the Company Does – [Brief business description]
📘 Learn Stock Market – [Educational insight about this stock or market concept]

Recent headlines for context:
${headlines}

Keep each section concise and informative.`;

    const deepseekResponse = await axios.post('https://api.deepseek.com/v1/chat/completions', {
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: 'You are a financial analyst providing structured stock analysis.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 800
    }, {
      headers: {
        'Authorization': `Bearer ${deepseekApiKey}`,
        'Content-Type': 'application/json'
      }
    });

    const analysis = deepseekResponse.data.choices[0].message.content;

    res.json({
      ticker: ticker.toUpperCase(),
      analysis,
      news: stockNews,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Stock Analysis API Error:", error.message);
    res.status(500).json({ 
      error: "Failed to analyze stock",
      analysis: `📌 Name – ${req.body.ticker?.toUpperCase() || 'Unknown'}\n📊 Current Market Status – Unable to determine\n📰 3 Important Headlines – News unavailable\n📈 Market Sentiment – Analysis unavailable\n🏢 What the Company Does – Information unavailable\n📘 Learn Stock Market – Please try again later`
    });
  }
});

// === DATABASE HEALTH CHECK ENDPOINT ===
app.get("/api/health", async (req, res) => {
  try {
    const isHealthy = await database.isHealthy();
    const stats = await database.getStats();
    
    res.json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      database: 'MongoDB',
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Health check error:", error.message);
    res.status(500).json({ 
      status: 'unhealthy',
      database: 'MongoDB',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// === PHASE 3: SCHEDULED TASKS ===
// Run database cleanup daily at 2 AM
cron.schedule('0 2 * * *', async () => {
  console.log('🧹 Running daily database cleanup');
  try {
    await database.cleanup();
  } catch (error) {
    console.error('Database cleanup error:', error);
  }
});

// Run geo-events monitoring every 30 minutes
cron.schedule('*/30 * * * *', async () => {
  console.log('Running scheduled geo-events monitoring');
  try {
    const rawEvents = await geoService.monitorGeoEvents();
    console.log(`Found ${rawEvents.length} potential geo events`);
    
    // Process high-priority events only during scheduled runs
    const highPriorityEvents = rawEvents.filter(event => {
      const text = `${event.title} ${event.description}`.toLowerCase();
      return ['crisis', 'emergency', 'fed', 'federal reserve', 'tariff'].some(
        keyword => text.includes(keyword)
      );
    });
    
    for (const event of highPriorityEvents.slice(0, 5)) {
      try {
        const analysis = await aiService.analyzeGeoEvent(event);
        await database.saveGeoEvent(analysis);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit
      } catch (error) {
        console.warn('Error processing scheduled geo event:', error.message);
      }
    }
  } catch (error) {
    console.error('Scheduled geo-events monitoring error:', error);
  }
});

// === Error Handler ===
app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err);
  res.status(500).json({ error: "Something went wrong on the server" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Backend running on port ${PORT}`));
