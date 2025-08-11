const mongoose = require('mongoose');

// Boardroom Intelligence Schema
const boardroomIntelligenceSchema = new mongoose.Schema({
  ticker: { type: String, required: true, index: true },
  filing_type: { type: String, required: true },
  title: { type: String, required: true },
  summary: { type: String, required: true },
  key_points: [String], // Array of key insights
  sentiment: { 
    type: String, 
    enum: ['bullish', 'bearish', 'neutral'], 
    required: true 
  },
  confidence_score: { 
    type: Number, 
    min: 0, 
    max: 1,
    default: 0.5 
  },
  impact_score: { 
    type: Number, 
    min: 0, 
    max: 100,
    default: 50,
    index: true
  },
  source_url: String,
  filing_date: String,
  risks: [String],
  opportunities: [String]
}, {
  timestamps: true,
  collection: 'boardroom_intelligence'
});

// Geo Events Schema
const geoEventsSchema = new mongoose.Schema({
  event_title: { type: String, required: true },
  event_type: { type: String, required: true },
  description: { type: String, required: true },
  affected_tickers: [String],
  affected_sectors: [String], 
  affected_countries: [String],
  risk_score: { 
    type: Number, 
    min: 0, 
    max: 100,
    default: 50,
    index: true
  },
  sentiment: { 
    type: String, 
    enum: ['positive', 'negative', 'neutral'],
    default: 'neutral'
  },
  source_url: String,
  event_date: String,
  is_alert: { 
    type: Boolean, 
    default: false,
    index: true
  },
  timeline: String,
  similar_events: String
}, {
  timestamps: true,
  collection: 'geo_events'
});

// Intelligence Cache Schema
const intelligenceCacheSchema = new mongoose.Schema({
  cache_key: { 
    type: String, 
    required: true, 
    unique: true,
    index: true
  },
  data: { type: mongoose.Schema.Types.Mixed, required: true },
  expires_at: { 
    type: Date, 
    required: true,
    index: true
  }
}, {
  timestamps: true,
  collection: 'intelligence_cache'
});

// Create TTL indexes for automatic cleanup
intelligenceCacheSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });
boardroomIntelligenceSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 }); // 24 hours  
geoEventsSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 }); // 24 hours

class MongoDatabase {
  constructor() {
    this.models = {};
    this.isConnected = false;
  }

  async initialize() {
    try {
      const mongoURL = process.env.MONGODB_URI || 'mongodb://localhost:27017/marketpulse';
      
      await mongoose.connect(mongoURL);
      
      this.isConnected = true;
      console.log('✅ Connected to MongoDB');
      
      // Initialize models
      this.models.BoardroomIntelligence = mongoose.model('BoardroomIntelligence', boardroomIntelligenceSchema);
      this.models.GeoEvents = mongoose.model('GeoEvents', geoEventsSchema);
      this.models.IntelligenceCache = mongoose.model('IntelligenceCache', intelligenceCacheSchema);
      
      console.log('📊 MongoDB models initialized');
      
      return true;
    } catch (error) {
      console.error('❌ MongoDB connection error:', error.message);
      throw error;
    }
  }

  // Boardroom Intelligence Methods
  async saveBoardroomInsight(data) {
    try {
      const insight = new this.models.BoardroomIntelligence({
        ticker: data.ticker,
        filing_type: data.filing_type,
        title: data.title,
        summary: data.summary,
        key_points: data.key_points || [],
        sentiment: data.sentiment,
        confidence_score: data.confidence_score,
        impact_score: data.impact_score,
        source_url: data.source_url,
        filing_date: data.filing_date,
        risks: data.risks || [],
        opportunities: data.opportunities || []
      });
      
      const saved = await insight.save();
      return saved._id.toString();
    } catch (error) {
      console.error('Error saving boardroom insight:', error);
      throw error;
    }
  }

  async getBoardroomInsights(limit = 10, ticker = null) {
    try {
      const query = ticker ? { ticker: ticker.toUpperCase() } : {};
      
      const insights = await this.models.BoardroomIntelligence
        .find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
        
      return insights.map(insight => ({
        ...insight,
        id: insight._id.toString(),
        created_at: insight.createdAt.toISOString()
      }));
    } catch (error) {
      console.error('Error getting boardroom insights:', error);
      throw error;
    }
  }

  // Geo Events Methods
  async saveGeoEvent(data) {
    try {
      const event = new this.models.GeoEvents({
        event_title: data.event_title,
        event_type: data.event_type,
        description: data.description,
        affected_tickers: data.affected_tickers || [],
        affected_sectors: data.affected_sectors || [],
        affected_countries: data.affected_countries || [],
        risk_score: data.risk_score,
        sentiment: data.sentiment,
        source_url: data.source_url,
        event_date: data.event_date,
        is_alert: data.is_alert || false,
        timeline: data.timeline,
        similar_events: data.similar_events
      });
      
      const saved = await event.save();
      return saved._id.toString();
    } catch (error) {
      console.error('Error saving geo event:', error);
      throw error;
    }
  }

  async getGeoEvents(limit = 10, alertsOnly = false) {
    try {
      const query = alertsOnly ? { is_alert: true } : {};
      
      const events = await this.models.GeoEvents
        .find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
        
      return events.map(event => ({
        ...event,
        id: event._id.toString(),
        created_at: event.createdAt.toISOString()
      }));
    } catch (error) {
      console.error('Error getting geo events:', error);
      throw error;
    }
  }

  // Cache Methods
  async getFromCache(key) {
    try {
      const cached = await this.models.IntelligenceCache
        .findOne({ 
          cache_key: key,
          expires_at: { $gt: new Date() }
        })
        .lean();
        
      return cached ? cached.data : null;
    } catch (error) {
      console.error('Error getting from cache:', error);
      return null;
    }
  }

  async setCache(key, data, ttlMinutes = 10) {
    try {
      const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
      
      await this.models.IntelligenceCache.findOneAndUpdate(
        { cache_key: key },
        { 
          cache_key: key,
          data: data,
          expires_at: expiresAt
        },
        { 
          upsert: true,
          new: true 
        }
      );
      
      return true;
    } catch (error) {
      console.error('Error setting cache:', error);
      throw error;
    }
  }

  // Cleanup old records (MongoDB TTL indexes handle this automatically)
  async cleanup() {
    try {
      // Manual cleanup if needed (TTL indexes should handle this automatically)
      const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const results = await Promise.all([
        this.models.BoardroomIntelligence.deleteMany({ createdAt: { $lt: cutoffTime } }),
        this.models.GeoEvents.deleteMany({ createdAt: { $lt: cutoffTime } }),
        this.models.IntelligenceCache.deleteMany({ expires_at: { $lt: new Date() } })
      ]);
      
      const totalDeleted = results.reduce((sum, result) => sum + result.deletedCount, 0);
      console.log(`🧹 MongoDB cleanup completed - removed ${totalDeleted} old records`);
      
      return totalDeleted;
    } catch (error) {
      console.error('Error during cleanup:', error);
      throw error;
    }
  }

  async close() {
    try {
      if (this.isConnected) {
        await mongoose.connection.close();
        this.isConnected = false;
        console.log('📴 MongoDB connection closed');
      }
    } catch (error) {
      console.error('Error closing MongoDB connection:', error);
    }
  }

  // Health check method
  async isHealthy() {
    try {
      if (!this.isConnected) return false;
      
      // Test connection with a simple query
      await this.models.IntelligenceCache.findOne().limit(1);
      return true;
    } catch (error) {
      console.error('MongoDB health check failed:', error);
      return false;
    }
  }

  // Get database statistics
  async getStats() {
    try {
      const stats = await Promise.all([
        this.models.BoardroomIntelligence.countDocuments(),
        this.models.GeoEvents.countDocuments(),
        this.models.IntelligenceCache.countDocuments(),
        this.models.GeoEvents.countDocuments({ is_alert: true })
      ]);

      return {
        boardroom_insights: stats[0],
        geo_events: stats[1],
        cache_entries: stats[2],
        active_alerts: stats[3],
        last_updated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting database stats:', error);
      return {
        boardroom_insights: 0,
        geo_events: 0, 
        cache_entries: 0,
        active_alerts: 0,
        last_updated: new Date().toISOString(),
        error: error.message
      };
    }
  }
}

module.exports = new MongoDatabase();