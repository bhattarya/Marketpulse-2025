const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
  constructor() {
    this.db = null;
  }

  async initialize() {
    return new Promise((resolve, reject) => {
      const dbPath = path.join(__dirname, 'intelligence.db');
      this.db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('Database connection error:', err);
          reject(err);
        } else {
          console.log('Connected to SQLite database');
          this.createTables().then(resolve).catch(reject);
        }
      });
    });
  }

  async createTables() {
    const tables = [
      // Boardroom intelligence from SEC filings and earnings
      `CREATE TABLE IF NOT EXISTS boardroom_intelligence (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticker TEXT NOT NULL,
        filing_type TEXT NOT NULL,
        title TEXT NOT NULL,
        summary TEXT NOT NULL,
        key_points TEXT,
        sentiment TEXT CHECK(sentiment IN ('bullish', 'bearish', 'neutral')) NOT NULL,
        confidence_score REAL CHECK(confidence_score >= 0 AND confidence_score <= 1),
        impact_score INTEGER CHECK(impact_score >= 0 AND impact_score <= 100),
        source_url TEXT,
        filing_date TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Geo-political events and their market impact
      `CREATE TABLE IF NOT EXISTS geo_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_title TEXT NOT NULL,
        event_type TEXT NOT NULL,
        description TEXT NOT NULL,
        affected_tickers TEXT,
        affected_sectors TEXT,
        affected_countries TEXT,
        risk_score INTEGER CHECK(risk_score >= 0 AND risk_score <= 100),
        sentiment TEXT CHECK(sentiment IN ('positive', 'negative', 'neutral')),
        source_url TEXT,
        event_date TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_alert BOOLEAN DEFAULT 0
      )`,
      
      // Cache table for API responses
      `CREATE TABLE IF NOT EXISTS intelligence_cache (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cache_key TEXT UNIQUE NOT NULL,
        data TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NOT NULL
      )`
    ];

    for (const tableSQL of tables) {
      await new Promise((resolve, reject) => {
        this.db.run(tableSQL, (err) => {
          if (err) {
            console.error('Error creating table:', err);
            reject(err);
          } else {
            resolve();
          }
        });
      });
    }
    
    console.log('Database tables created successfully');
  }

  // Boardroom Intelligence Methods
  async saveBoardroomInsight(data) {
    const {
      ticker, filing_type, title, summary, key_points,
      sentiment, confidence_score, impact_score, source_url, filing_date
    } = data;

    return new Promise((resolve, reject) => {
      const sql = `INSERT INTO boardroom_intelligence 
        (ticker, filing_type, title, summary, key_points, sentiment, confidence_score, impact_score, source_url, filing_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      
      this.db.run(sql, [
        ticker, filing_type, title, summary, JSON.stringify(key_points),
        sentiment, confidence_score, impact_score, source_url, filing_date
      ], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });
    });
  }

  async getBoardroomInsights(limit = 10, ticker = null) {
    return new Promise((resolve, reject) => {
      let sql = `SELECT * FROM boardroom_intelligence`;
      const params = [];
      
      if (ticker) {
        sql += ` WHERE ticker = ?`;
        params.push(ticker);
      }
      
      sql += ` ORDER BY created_at DESC LIMIT ?`;
      params.push(limit);

      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          const formatted = rows.map(row => ({
            ...row,
            key_points: JSON.parse(row.key_points || '[]')
          }));
          resolve(formatted);
        }
      });
    });
  }

  // Geo Events Methods
  async saveGeoEvent(data) {
    const {
      event_title, event_type, description, affected_tickers,
      affected_sectors, affected_countries, risk_score, sentiment,
      source_url, event_date, is_alert
    } = data;

    return new Promise((resolve, reject) => {
      const sql = `INSERT INTO geo_events 
        (event_title, event_type, description, affected_tickers, affected_sectors, 
         affected_countries, risk_score, sentiment, source_url, event_date, is_alert)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      
      this.db.run(sql, [
        event_title, event_type, description, JSON.stringify(affected_tickers),
        JSON.stringify(affected_sectors), JSON.stringify(affected_countries),
        risk_score, sentiment, source_url, event_date, is_alert ? 1 : 0
      ], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });
    });
  }

  async getGeoEvents(limit = 10, alertsOnly = false) {
    return new Promise((resolve, reject) => {
      let sql = `SELECT * FROM geo_events`;
      const params = [];
      
      if (alertsOnly) {
        sql += ` WHERE is_alert = 1`;
      }
      
      sql += ` ORDER BY created_at DESC LIMIT ?`;
      params.push(limit);

      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          const formatted = rows.map(row => ({
            ...row,
            affected_tickers: JSON.parse(row.affected_tickers || '[]'),
            affected_sectors: JSON.parse(row.affected_sectors || '[]'),
            affected_countries: JSON.parse(row.affected_countries || '[]'),
            is_alert: Boolean(row.is_alert)
          }));
          resolve(formatted);
        }
      });
    });
  }

  // Cache Methods
  async getFromCache(key) {
    return new Promise((resolve, reject) => {
      const sql = `SELECT data FROM intelligence_cache 
                   WHERE cache_key = ? AND expires_at > datetime('now')`;
      
      this.db.get(sql, [key], (err, row) => {
        if (err) {
          reject(err);
        } else if (row) {
          try {
            resolve(JSON.parse(row.data));
          } catch (parseErr) {
            reject(parseErr);
          }
        } else {
          resolve(null);
        }
      });
    });
  }

  async setCache(key, data, ttlMinutes = 10) {
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000)
      .toISOString().replace('T', ' ').replace('Z', '');
    
    return new Promise((resolve, reject) => {
      const sql = `INSERT OR REPLACE INTO intelligence_cache 
                   (cache_key, data, expires_at) VALUES (?, ?, ?)`;
      
      this.db.run(sql, [key, JSON.stringify(data), expiresAt], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });
    });
  }

  // Cleanup old records (keep last 24 hours)
  async cleanup() {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000)
      .toISOString().replace('T', ' ').replace('Z', '');
    
    const promises = [
      new Promise((resolve, reject) => {
        this.db.run(
          `DELETE FROM boardroom_intelligence WHERE created_at < ?`,
          [cutoffTime],
          (err) => err ? reject(err) : resolve()
        );
      }),
      new Promise((resolve, reject) => {
        this.db.run(
          `DELETE FROM geo_events WHERE created_at < ?`,
          [cutoffTime],
          (err) => err ? reject(err) : resolve()
        );
      }),
      new Promise((resolve, reject) => {
        this.db.run(
          `DELETE FROM intelligence_cache WHERE expires_at < datetime('now')`,
          (err) => err ? reject(err) : resolve()
        );
      })
    ];

    await Promise.all(promises);
    console.log('Database cleanup completed');
  }

  async close() {
    if (this.db) {
      return new Promise((resolve) => {
        this.db.close((err) => {
          if (err) {
            console.error('Error closing database:', err);
          } else {
            console.log('Database connection closed');
          }
          resolve();
        });
      });
    }
  }
}

module.exports = new Database();