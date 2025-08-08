require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(cors());
app.use(express.json());

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

// === Error Handler ===
app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err);
  res.status(500).json({ error: "Something went wrong on the server" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Backend running on port ${PORT}`));
