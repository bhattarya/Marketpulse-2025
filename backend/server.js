require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const cron = require('node-cron');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Import Phase 3 Intelligence Services
const database = require('./mongoDatabase'); // Changed to MongoDB
const SECDataService = require('./secData');
const AIAnalysisService = require('./aiAnalysis');
const GeoEventsService = require('./geoEvents');
const EnhancedBoardroomIntelligence = require('./enhancedBoardroomIntelligence');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Phase 3 Services
const secService = new SECDataService();
const aiService = new AIAnalysisService();
const geoService = new GeoEventsService();
const enhancedBoardroomService = new EnhancedBoardroomIntelligence();

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

// === Gemini Client ===
const genAI = process.env.GOOGLE_API_KEY
  ? new GoogleGenerativeAI(process.env.GOOGLE_API_KEY)
  : null;

async function summarizeWithGemini(articles) {
  if (!genAI) throw new Error("Missing GOOGLE_API_KEY");

  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || "gemini-1.5-flash"
  });

  const prompt = `
You are summarizing financial news for investors.
For each article, return:
Summary: Two short, clear sentences.
Sentiment: Positive, Negative, or Neutral.

Articles:
${articles.map((a, i) => `[${i + 1}]
Title: ${a.title || ""}
Description: ${a.description || ""}`).join("\n\n")}
`;

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }]
  });

  const text = result.response.text();
  const blocks = text.split(/\[\d+\]/).slice(1);

  return articles.map((article, i) => {
    const block = blocks[i] || "";
    const sumMatch = block.match(/Summary:\s*([\s\S]*?)\n/i);
    const sentMatch = block.match(/Sentiment:\s*(Positive|Negative|Neutral)/i);

    return {
      title: article.title,
      url: article.url,
      image: article.urlToImage,
      source: article.source?.name || article.source || "Unknown",
      summary: sumMatch ? sumMatch[1].trim() : article.description || "No summary available",
      sentiment: sentMatch ? sentMatch[1] : "Neutral",
      publishedAt: article.publishedAt || null
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

// === Stocks Route ===
app.get("/api/stocks", async (req, res) => {
  try {
    const symbol = (req.query.symbol || "AAPL").toUpperCase();
    const now = Date.now();
    if (stockCache[symbol] && now - stockCacheTime[symbol] < 60000) {
      return res.json(stockCache[symbol]);
    }

    const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${process.env.FINNHUB_KEY}`;
    const { data } = await axios.get(url);

    if (!data || !data.c) {
      if (stockCache[symbol]) return res.json(stockCache[symbol]);
      return res.status(500).json({ error: `No data for ${symbol}` });
    }

    const formatted = {
      symbol,
      price: data.c,
      change: data.d,
      changePercent: data.dp,
      high: data.h,
      low: data.l,
      open: data.o,
      prevClose: data.pc
    };

    stockCache[symbol] = formatted;
    stockCacheTime[symbol] = now;
    res.json(formatted);
  } catch (err) {
    console.error(`Stocks API Error for ${req.query.symbol}:`, err.message);
    if (stockCache[req.query.symbol?.toUpperCase()]) {
      return res.json(stockCache[req.query.symbol.toUpperCase()]);
    }
    res.status(500).json({ error: "Error fetching stock data" });
  }
});

// === News Route (Gemini Only) ===
app.get("/api/news", async (req, res) => {
  try {
    const ticker = (req.query.ticker || "stock market").toUpperCase();
    const now = Date.now();
    if (newsCache[ticker] && now - newsCacheTime[ticker] < 300000) {
      return res.json(newsCache[ticker]);
    }

    let articles = [];

    // Try NewsAPI
    try {
      const newsRes = await axios.get(
        `https://newsapi.org/v2/everything?q=${encodeURIComponent(ticker)}&language=en&sortBy=publishedAt&pageSize=5&apiKey=${process.env.NEWS_API_KEY}`
      );
      articles = newsRes.data.articles || [];
    } catch (err) {
      console.warn("NewsAPI failed, falling back to Finnhub...");
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
    }

    if (!articles.length) {
      newsCache[ticker] = [];
      newsCacheTime[ticker] = now;
      return res.json([]);
    }

    let summaries;
    try {
      summaries = await summarizeWithGemini(articles);
    } catch (err) {
      console.error("Gemini Error:", err.message);
      summaries = articles.map(a => ({
        title: a.title,
        url: a.url,
        image: a.urlToImage,
        source: a.source?.name || a.source || "Unknown",
        summary: a.description || "No summary available",
        sentiment: "Neutral",
        publishedAt: a.publishedAt || null
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
