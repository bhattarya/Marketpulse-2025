const axios = require('axios');

class CrossMarketCorrelationEngine {
  constructor() {
    this.finnhubKey = process.env.FINNHUB_KEY;
    this.coingeckoBase = process.env.COINGECKO_BASE || 'https://api.coingecko.com/api/v3';
  }

  // Main correlation analysis function
  async analyzeCorrelation(asset1, asset2, timeframe = 30) {
    try {
      console.log(`Analyzing correlation between ${asset1.symbol} and ${asset2.symbol}`);
      
      // Get historical data for both assets
      const [data1, data2] = await Promise.all([
        this.getAssetData(asset1, timeframe),
        this.getAssetData(asset2, timeframe)
      ]);

      if (!data1 || !data2 || data1.length < 5 || data2.length < 5) {
        throw new Error('Insufficient data for correlation analysis');
      }

      // Normalize data to daily returns
      const returns1 = this.calculateReturns(data1);
      const returns2 = this.calculateReturns(data2);

      // Align data by dates and calculate correlation
      const alignedData = this.alignDataByDate(returns1, returns2);
      const correlation = this.calculatePearsonCorrelation(alignedData.series1, alignedData.series2);

      // Generate insights
      const insight = this.generateCorrelationInsight(asset1, asset2, correlation, alignedData);

      return {
        asset1: asset1,
        asset2: asset2,
        correlation: correlation,
        correlation_strength: this.getCorrelationStrength(correlation),
        timeframe: timeframe,
        data_points: alignedData.series1.length,
        chart_data: this.prepareChartData(alignedData),
        insight: insight,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Error in correlation analysis:`, error.message);
      return this.getFallbackCorrelation(asset1, asset2, error.message);
    }
  }

  // Get historical data for different asset types
  async getAssetData(asset, days) {
    try {
      switch (asset.type) {
        case 'stock':
          return await this.getStockData(asset.symbol, days);
        case 'crypto':
          return await this.getCryptoData(asset.symbol, days);
        case 'forex':
          return await this.getForexData(asset.symbol, days);
        default:
          throw new Error(`Unsupported asset type: ${asset.type}`);
      }
    } catch (error) {
      console.warn(`Error getting data for ${asset.symbol}:`, error.message);
      return null;
    }
  }

  // Get stock historical data
  async getStockData(symbol, days) {
    try {
      // First try Finnhub API
      if (this.finnhubKey && this.finnhubKey !== 'd2aetnhr01qoad6pi37gd2aetnhr01qoad6pi37gd2aetnhr01qoad6pi380') {
        const toDate = Math.floor(Date.now() / 1000);
        const fromDate = toDate - (days * 24 * 60 * 60);
        
        const response = await axios.get(
          `https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=D&from=${fromDate}&to=${toDate}&token=${this.finnhubKey}`
        );

        if (response.data.s === 'ok' && response.data.c) {
          return response.data.t.map((timestamp, index) => ({
            date: new Date(timestamp * 1000).toISOString().split('T')[0],
            price: response.data.c[index],
            timestamp: timestamp
          }));
        }
      }
      
      // Fallback to realistic mock data
      throw new Error('Using mock data for demonstration');
    } catch (error) {
      console.error(`Failed to get stock data for ${symbol}:`, error.message);
      throw new Error(`Stock data unavailable for ${symbol}. Please check API configuration.`);
    }
  }

  // Get crypto historical data
  async getCryptoData(symbol, days) {
    try {
      const cryptoId = this.getCryptoId(symbol);
      const response = await axios.get(
        `${this.coingeckoBase}/coins/${cryptoId}/market_chart?vs_currency=usd&days=${days}&interval=daily`
      );

      return response.data.prices.map(([timestamp, price]) => ({
        date: new Date(timestamp).toISOString().split('T')[0],
        price: price,
        timestamp: Math.floor(timestamp / 1000)
      }));
    } catch (error) {
      console.error(`Failed to get crypto data for ${symbol}:`, error.message);
      throw new Error(`Crypto data unavailable for ${symbol}. Please check API configuration.`);
    }
  }

  // Get forex data (simplified - requires forex API)
  async getForexData(symbol, days) {
    throw new Error(`Forex data not available for ${symbol}. Forex API integration required.`);
  }

  // Note: Mock data generators removed - now requires valid API keys

  // Calculate daily returns (percentage changes)
  calculateReturns(data) {
    const returns = [];
    
    for (let i = 1; i < data.length; i++) {
      const currentPrice = data[i].price;
      const previousPrice = data[i - 1].price;
      const returnPct = (currentPrice - previousPrice) / previousPrice;
      
      returns.push({
        date: data[i].date,
        return: returnPct,
        price: currentPrice
      });
    }
    
    return returns;
  }

  // Align two return series by matching dates
  alignDataByDate(returns1, returns2) {
    const aligned1 = [];
    const aligned2 = [];
    const dates = [];
    
    // Create a map for faster lookup
    const returns2Map = new Map(returns2.map(r => [r.date, r]));
    
    for (const r1 of returns1) {
      const r2 = returns2Map.get(r1.date);
      if (r2) {
        aligned1.push(r1.return);
        aligned2.push(r2.return);
        dates.push(r1.date);
      }
    }
    
    return {
      series1: aligned1,
      series2: aligned2,
      dates: dates
    };
  }

  // Calculate Pearson correlation coefficient
  calculatePearsonCorrelation(x, y) {
    if (x.length !== y.length || x.length === 0) {
      return 0;
    }
    
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    if (denominator === 0) return 0;
    
    return numerator / denominator;
  }

  // Determine correlation strength category
  getCorrelationStrength(correlation) {
    const abs = Math.abs(correlation);
    
    if (abs >= 0.8) return 'Very Strong';
    if (abs >= 0.6) return 'Strong';
    if (abs >= 0.4) return 'Moderate';
    if (abs >= 0.2) return 'Weak';
    return 'Very Weak';
  }

  // Generate human-friendly correlation insight
  generateCorrelationInsight(asset1, asset2, correlation, data) {
    const strength = this.getCorrelationStrength(correlation);
    const direction = correlation > 0 ? 'positive' : 'negative';
    const abs = Math.abs(correlation);
    
    let relationship;
    if (abs >= 0.7) {
      relationship = correlation > 0 ? 'move strongly together' : 'move strongly in opposite directions';
    } else if (abs >= 0.4) {
      relationship = correlation > 0 ? 'tend to move together' : 'tend to move in opposite directions';
    } else {
      relationship = 'show little consistent relationship';
    }
    
    // Generate explanation based on asset types
    let explanation = '';
    if (asset1.type === 'stock' && asset2.type === 'crypto') {
      if (abs >= 0.4) {
        explanation = correlation > 0 
          ? 'This suggests both markets may be influenced by similar risk sentiment and macroeconomic factors.'
          : 'This indicates they may serve as hedges against each other during market volatility.';
      } else {
        explanation = 'These markets appear to operate independently, driven by different fundamental factors.';
      }
    } else if (asset1.type === 'stock' && asset2.type === 'stock') {
      if (abs >= 0.4) {
        explanation = 'Both stocks may be influenced by similar sector trends or market conditions.';
      } else {
        explanation = 'These stocks appear to be driven by different company-specific or sector factors.';
      }
    } else {
      explanation = `The ${strength.toLowerCase()} correlation suggests these assets are ${relationship}.`;
    }
    
    return {
      summary: `${asset1.symbol} and ${asset2.symbol} show a ${strength.toLowerCase()} ${direction} correlation (${correlation.toFixed(3)}).`,
      relationship: relationship,
      explanation: explanation,
      strength: strength,
      direction: direction
    };
  }

  // Prepare data for charting
  prepareChartData(alignedData) {
    return alignedData.dates.map((date, index) => ({
      date: date,
      asset1_return: (alignedData.series1[index] * 100).toFixed(2), // Convert to percentage
      asset2_return: (alignedData.series2[index] * 100).toFixed(2)
    }));
  }

  // Get crypto ID for CoinGecko API
  getCryptoId(symbol) {
    const cryptoMap = {
      'BTC': 'bitcoin',
      'ETH': 'ethereum',
      'ADA': 'cardano',
      'DOT': 'polkadot',
      'LINK': 'chainlink'
    };
    
    return cryptoMap[symbol.toUpperCase()] || 'bitcoin';
  }

  // Fallback correlation result
  getFallbackCorrelation(asset1, asset2, error) {
    return {
      asset1: asset1,
      asset2: asset2,
      error: "API_ERROR",
      message: "Correlation analysis requires valid API keys",
      details: error,
      timestamp: new Date().toISOString()
    };
  }

  // Analyze multiple correlations at once
  async analyzeMultipleCorrelations(assets, timeframe = 30) {
    const correlations = [];
    
    // Generate all unique pairs
    for (let i = 0; i < assets.length; i++) {
      for (let j = i + 1; j < assets.length; j++) {
        try {
          const correlation = await this.analyzeCorrelation(assets[i], assets[j], timeframe);
          correlations.push(correlation);
          
          // Add delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.warn(`Failed correlation analysis for ${assets[i].symbol}-${assets[j].symbol}:`, error.message);
        }
      }
    }
    
    return {
      correlations: correlations,
      summary: {
        total_pairs: correlations.length,
        strong_correlations: correlations.filter(c => Math.abs(c.correlation) >= 0.6).length,
        average_correlation: correlations.reduce((sum, c) => sum + Math.abs(c.correlation), 0) / correlations.length,
        timestamp: new Date().toISOString()
      }
    };
  }
}

module.exports = CrossMarketCorrelationEngine;