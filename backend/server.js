require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());

// === CACHE for stocks & crypto ===
let stockCache = {};
let stockCacheTime = {};
let cryptoCache = null;
let cryptoCacheTime = 0;

// === Crypto Route (60s caching) ===
app.get('/api/crypto', async (req, res) => {
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
    res.status(500).json({ error: 'Error fetching crypto data' });
  }
});

// === Stocks Route using Finnhub (60s caching) ===
app.get('/api/stocks', async (req, res) => {
  try {
    const symbol = (req.query.symbol || 'AAPL').toUpperCase();
    const now = Date.now();

    // Serve from cache if fresh
    if (stockCache[symbol] && now - stockCacheTime[symbol] < 60000) {
      return res.json(stockCache[symbol]);
    }

    const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${process.env.FINNHUB_KEY}`;
    const { data } = await axios.get(url);

    // If API fails or no data
    if (!data || !data.c) {
      console.warn(`Finnhub failed for ${symbol}`);
      if (stockCache[symbol]) {
        return res.json(stockCache[symbol]); // fallback to last known
      }
      return res.status(500).json({ error: `No data for ${symbol}` });
    }

    // Standardized format for frontend
    const formattedData = {
      symbol,
      price: data.c,
      change: data.d,
      changePercent: data.dp,
      high: data.h,
      low: data.l,
      open: data.o,
      prevClose: data.pc
    };

    // Save to cache
    stockCache[symbol] = formattedData;
    stockCacheTime[symbol] = now;

    res.json(formattedData);
  } catch (err) {
    console.error(`Stocks API Error for ${req.query.symbol}:`, err.message);
    if (stockCache[req.query.symbol?.toUpperCase()]) {
      return res.json(stockCache[req.query.symbol.toUpperCase()]);
    }
    res.status(500).json({ error: 'Error fetching stock data' });
  }
});

// === Global error handler ===
app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err);
  res.status(500).json({ error: "Something went wrong on the server" });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Backend running on port ${PORT}`));
