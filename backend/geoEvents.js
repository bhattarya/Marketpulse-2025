const axios = require('axios');
const cheerio = require('cheerio');

class GeoEventsService {
  constructor() {
    this.sources = [
      {
        name: 'Reuters Business',
        url: 'https://www.reuters.com/business/',
        keywords: ['tariff', 'sanction', 'trade war', 'policy', 'regulation', 'election']
      },
      {
        name: 'Associated Press',
        url: 'https://apnews.com/hub/business',
        keywords: ['economy', 'trade', 'sanctions', 'policy', 'markets']
      }
    ];

    this.eventKeywords = {
      tariff: ['tariff', 'trade duty', 'import tax', 'customs', 'trade barrier'],
      sanction: ['sanctions', 'embargo', 'economic penalty', 'trade restriction'],
      policy: ['monetary policy', 'fiscal policy', 'regulation', 'federal reserve'],
      election: ['election', 'vote', 'candidate', 'political', 'presidency'],
      disaster: ['earthquake', 'hurricane', 'flood', 'disaster', 'emergency'],
      conflict: ['war', 'conflict', 'military', 'invasion', 'attack', 'violence'],
      other: ['crisis', 'bankruptcy', 'merger', 'acquisition', 'lawsuit']
    };
  }

  // Monitor news sources for geopolitical events
  async monitorGeoEvents() {
    try {
      const events = [];
      
      // Use NewsAPI as primary source for global news
      if (process.env.NEWS_API_KEY) {
        const newsAPIEvents = await this.fetchFromNewsAPI();
        events.push(...newsAPIEvents);
      }
      
      // Fallback to RSS feeds and web scraping
      const webEvents = await this.fetchFromWebSources();
      events.push(...webEvents);
      
      // Filter and categorize events
      const categorizedEvents = this.categorizeEvents(events);
      
      // Remove duplicates based on title similarity
      const uniqueEvents = this.removeDuplicates(categorizedEvents);
      
      return uniqueEvents.slice(0, 20); // Limit to 20 most recent
    } catch (error) {
      console.error('Error monitoring geo events:', error);
      return [];
    }
  }

  async fetchFromNewsAPI() {
    try {
      const geoKeywords = [
        'tariff', 'sanctions', 'trade war', 'federal reserve',
        'election results', 'policy change', 'regulation',
        'geopolitical', 'international trade', 'economic policy'
      ];

      const events = [];
      
      for (const keyword of geoKeywords.slice(0, 5)) { // Limit API calls
        try {
          const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(keyword)}&language=en&sortBy=publishedAt&pageSize=5&apiKey=${process.env.NEWS_API_KEY}`;
          const response = await axios.get(url);
          
          if (response.data.articles) {
            const articles = response.data.articles.map(article => ({
              title: article.title,
              description: article.description || '',
              url: article.url,
              source: article.source.name,
              publishedAt: article.publishedAt,
              keyword
            }));
            
            events.push(...articles);
          }
          
          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.warn(`NewsAPI error for keyword ${keyword}:`, error.message);
        }
      }
      
      return events;
    } catch (error) {
      console.error('NewsAPI fetch error:', error);
      return [];
    }
  }

  async fetchFromWebSources() {
    // For now, return mock data representing various geopolitical events
    // In production, this would scrape actual news sources
    
    const mockEvents = [
      {
        title: "U.S. Announces New Tariffs on Chinese Solar Panels",
        description: "The Biden administration announced 25% tariffs on Chinese solar panel imports, citing unfair trade practices and national security concerns.",
        url: "https://example.com/tariff-news",
        source: "Reuters",
        publishedAt: new Date().toISOString(),
        keyword: "tariff"
      },
      {
        title: "Federal Reserve Signals Interest Rate Changes Ahead",
        description: "Fed Chair Jerome Powell indicated potential policy shifts in response to inflation data, affecting global markets.",
        url: "https://example.com/fed-news",
        source: "Wall Street Journal",
        publishedAt: new Date(Date.now() - 3600000).toISOString(),
        keyword: "policy"
      },
      {
        title: "EU Imposes New Sanctions on Russian Energy Sector",
        description: "European Union expands sanctions targeting Russian oil and gas companies in response to ongoing conflicts.",
        url: "https://example.com/sanctions-news",
        source: "Financial Times",
        publishedAt: new Date(Date.now() - 7200000).toISOString(),
        keyword: "sanction"
      }
    ];
    
    return mockEvents;
  }

  categorizeEvents(events) {
    return events.map(event => {
      const eventType = this.classifyEventType(event.title, event.description);
      
      return {
        ...event,
        eventType,
        date: event.publishedAt ? event.publishedAt.split('T')[0] : new Date().toISOString().split('T')[0]
      };
    });
  }

  classifyEventType(title, description) {
    const text = `${title} ${description}`.toLowerCase();
    
    for (const [type, keywords] of Object.entries(this.eventKeywords)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        return type;
      }
    }
    
    return 'other';
  }

  removeDuplicates(events) {
    const seen = new Set();
    return events.filter(event => {
      // Create a simple fingerprint based on title words
      const fingerprint = event.title
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .sort()
        .slice(0, 5) // Use first 5 significant words
        .join(' ');
      
      if (seen.has(fingerprint)) {
        return false;
      }
      
      seen.add(fingerprint);
      return true;
    });
  }

  // Get recent high-impact events for alerts
  async getAlerts(riskThreshold = 70) {
    try {
      const events = await this.monitorGeoEvents();
      
      // Filter for high-impact keywords
      const highImpactKeywords = [
        'federal reserve', 'interest rate', 'tariff', 'sanctions', 
        'trade war', 'election', 'crisis', 'emergency'
      ];
      
      const alerts = events.filter(event => {
        const text = `${event.title} ${event.description}`.toLowerCase();
        return highImpactKeywords.some(keyword => text.includes(keyword));
      });
      
      return alerts.slice(0, 10); // Limit alerts
    } catch (error) {
      console.error('Error getting geo event alerts:', error);
      return [];
    }
  }

  // Analyze event impact on specific sectors
  analyzeSectorImpact(event, sectors = []) {
    const { title, description, eventType } = event;
    const text = `${title} ${description}`.toLowerCase();
    
    const sectorImpacts = {
      technology: ['tech', 'semiconductor', 'software', 'apple', 'microsoft', 'google'],
      energy: ['oil', 'gas', 'energy', 'renewable', 'solar', 'wind', 'nuclear'],
      finance: ['bank', 'financial', 'credit', 'loan', 'interest', 'fed'],
      healthcare: ['healthcare', 'pharma', 'medical', 'drug', 'hospital'],
      retail: ['retail', 'consumer', 'amazon', 'walmart', 'shopping'],
      manufacturing: ['manufacturing', 'industrial', 'factory', 'production'],
      transportation: ['airline', 'shipping', 'logistics', 'transport'],
      agriculture: ['agriculture', 'farming', 'food', 'crop']
    };
    
    const affectedSectors = [];
    
    for (const [sector, keywords] of Object.entries(sectorImpacts)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        affectedSectors.push(sector);
      }
    }
    
    // Add sector-specific impacts based on event type
    if (eventType === 'tariff') {
      affectedSectors.push('manufacturing', 'technology', 'retail');
    } else if (eventType === 'sanction') {
      affectedSectors.push('energy', 'finance');
    } else if (eventType === 'policy') {
      affectedSectors.push('finance', 'healthcare');
    }
    
    return [...new Set(affectedSectors)]; // Remove duplicates
  }

  // Generate risk score based on event characteristics
  calculateRiskScore(event) {
    let score = 30; // Base score
    
    const { title, description, eventType, source } = event;
    const text = `${title} ${description}`.toLowerCase();
    
    // Event type scoring
    const typeScores = {
      tariff: 40,
      sanction: 35,
      policy: 30,
      election: 25,
      conflict: 50,
      disaster: 20,
      other: 15
    };
    
    score += typeScores[eventType] || 15;
    
    // High-impact keywords
    const highImpactWords = [
      'emergency', 'crisis', 'collapse', 'war', 'invasion',
      'federal reserve', 'interest rate', 'recession', 'inflation'
    ];
    
    const impactWordCount = highImpactWords.filter(word => 
      text.includes(word)
    ).length;
    
    score += impactWordCount * 10;
    
    // Source credibility boost
    const credibleSources = [
      'reuters', 'associated press', 'wall street journal',
      'financial times', 'bloomberg', 'cnbc'
    ];
    
    if (credibleSources.some(s => source?.toLowerCase().includes(s))) {
      score += 10;
    }
    
    // Scale and boundaries
    score = Math.min(100, Math.max(0, score));
    
    return Math.round(score);
  }
}

module.exports = GeoEventsService;