const { GoogleGenerativeAI } = require('@google/generative-ai');

class AIAnalysisService {
  constructor() {
    this.genAI = process.env.GOOGLE_API_KEY 
      ? new GoogleGenerativeAI(process.env.GOOGLE_API_KEY)
      : null;
      
    if (!this.genAI) {
      console.warn('Google API Key not found - AI analysis will be disabled');
    }
  }

  // Analyze SEC filings and earnings for boardroom intelligence
  async analyzeBoardroomData(companyData) {
    if (!this.genAI) {
      throw new Error('AI service not available - missing API key');
    }

    try {
      const model = this.genAI.getGenerativeModel({
        model: process.env.GEMINI_MODEL || "gemini-1.5-flash"
      });

      const analysisText = this.formatBoardroomPrompt(companyData);
      
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: analysisText }] }]
      });

      const response = result.response.text();
      return this.parseBoardroomResponse(response, companyData.ticker);
    } catch (error) {
      console.error('Error in AI boardroom analysis:', error);
      throw error;
    }
  }

  formatBoardroomPrompt(companyData) {
    const { ticker, filings, earnings } = companyData;
    
    return `You are a financial analyst providing boardroom intelligence for institutional investors.

Analyze the following company data and provide actionable insights:

Company: ${ticker}

SEC FILINGS:
${filings.map((filing, i) => `
Filing ${i + 1}: ${filing.form} (${filing.filingDate})
Content: ${filing.content ? filing.content.substring(0, 3000) : 'Content not available'}
`).join('\n')}

EARNINGS CALLS:
${earnings?.map((earning, i) => `
Call ${i + 1}: ${earning.title} (${earning.date})
Content: ${earning.content || 'Transcript not available'}
`).join('\n') || 'No earnings call data available'}

Provide your analysis in the following structured format:

TITLE: [Create a concise, attention-grabbing headline about the key finding]

SUMMARY: [2-3 sentences summarizing the most important insight for investors]

KEY_POINTS: [List 3-5 specific, actionable bullet points. Each should be a concrete insight that could affect stock price or investment decisions]

SENTIMENT: [Choose one: bullish, bearish, or neutral - based on overall implications for the stock]

CONFIDENCE: [Rate your confidence in this analysis from 0.1 to 1.0]

IMPACT_SCORE: [Rate potential market impact from 0-100, where 100 is major market-moving news]

RISKS: [List 2-3 specific risks or red flags investors should watch]

OPPORTUNITIES: [List 2-3 specific opportunities or positive catalysts]

Focus on:
- Material changes in business performance or strategy
- Forward-looking statements and guidance
- Regulatory issues or compliance matters
- Management commentary on market conditions
- Risk factors that could impact future performance
- Competitive positioning changes

Be specific, actionable, and focus on insights that aren't obvious from just looking at stock price charts.`;
  }

  parseBoardroomResponse(response, ticker) {
    try {
      const sections = {};
      
      // Extract sections using regex patterns
      const patterns = {
        title: /TITLE:\s*(.+?)(?=\n|$)/i,
        summary: /SUMMARY:\s*([\s\S]*?)(?=\nKEY_POINTS:|$)/i,
        key_points: /KEY_POINTS:\s*([\s\S]*?)(?=\nSENTIMENT:|$)/i,
        sentiment: /SENTIMENT:\s*(.+?)(?=\n|$)/i,
        confidence: /CONFIDENCE:\s*(.+?)(?=\n|$)/i,
        impact_score: /IMPACT_SCORE:\s*(.+?)(?=\n|$)/i,
        risks: /RISKS:\s*([\s\S]*?)(?=\nOPPORTUNITIES:|$)/i,
        opportunities: /OPPORTUNITIES:\s*([\s\S]*?)(?=\n[A-Z_]+:|$)/i
      };

      for (const [key, pattern] of Object.entries(patterns)) {
        const match = response.match(pattern);
        sections[key] = match ? match[1].trim() : '';
      }

      // Parse key points into array
      const keyPointsText = sections.key_points || '';
      const keyPoints = keyPointsText
        .split(/[-•*]\s*/)
        .filter(point => point.trim().length > 10)
        .map(point => point.trim());

      // Parse risks and opportunities
      const risks = (sections.risks || '')
        .split(/[-•*]\s*/)
        .filter(risk => risk.trim().length > 5)
        .map(risk => risk.trim());

      const opportunities = (sections.opportunities || '')
        .split(/[-•*]\s*/)
        .filter(opp => opp.trim().length > 5)
        .map(opp => opp.trim());

      // Clean and validate sentiment
      let sentiment = (sections.sentiment || 'neutral').toLowerCase();
      if (!['bullish', 'bearish', 'neutral'].includes(sentiment)) {
        sentiment = 'neutral';
      }

      // Parse numeric values
      const confidence = Math.max(0.1, Math.min(1.0, 
        parseFloat(sections.confidence) || 0.5));
      const impactScore = Math.max(0, Math.min(100, 
        parseInt(sections.impact_score) || 50));

      return {
        ticker,
        filing_type: 'mixed', // Since we analyze multiple filing types
        title: sections.title || `${ticker} Boardroom Intelligence Update`,
        summary: sections.summary || 'Analysis summary not available',
        key_points: keyPoints,
        sentiment,
        confidence_score: confidence,
        impact_score: impactScore,
        risks,
        opportunities,
        source_url: null, // Will be set by the calling function
        filing_date: new Date().toISOString().split('T')[0]
      };
    } catch (error) {
      console.error('Error parsing boardroom response:', error);
      
      // Return fallback structure
      return {
        ticker,
        filing_type: 'mixed',
        title: `${ticker} Analysis Update`,
        summary: 'AI analysis completed but parsing failed',
        key_points: [],
        sentiment: 'neutral',
        confidence_score: 0.3,
        impact_score: 25,
        risks: [],
        opportunities: [],
        source_url: null,
        filing_date: new Date().toISOString().split('T')[0]
      };
    }
  }

  // Analyze geopolitical events for market impact
  async analyzeGeoEvent(eventData) {
    if (!this.genAI) {
      throw new Error('AI service not available - missing API key');
    }

    try {
      const model = this.genAI.getGenerativeModel({
        model: process.env.GEMINI_MODEL || "gemini-1.5-flash"
      });

      const prompt = this.formatGeoEventPrompt(eventData);
      
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }]
      });

      const response = result.response.text();
      return this.parseGeoEventResponse(response, eventData);
    } catch (error) {
      console.error('Error in AI geo-event analysis:', error);
      throw error;
    }
  }

  formatGeoEventPrompt(eventData) {
    return `You are a geopolitical risk analyst for financial markets.

Analyze this event and its potential market impact:

Event: ${eventData.title}
Description: ${eventData.description}
Source: ${eventData.source || 'Unknown'}
Date: ${eventData.date || 'Recent'}

Provide analysis in this structured format:

EVENT_TYPE: [Classify as: tariff, sanction, election, disaster, policy, conflict, or other]

MARKET_IMPACT: [Describe the likely impact on financial markets in 2-3 sentences]

AFFECTED_TICKERS: [List 5-10 specific stock tickers that could be most affected, separated by commas]

AFFECTED_SECTORS: [List 3-5 market sectors most impacted, separated by commas]

AFFECTED_COUNTRIES: [List countries/regions most affected, separated by commas]

RISK_SCORE: [Rate from 0-100 where 100 is maximum market disruption]

SENTIMENT: [Choose: positive, negative, or neutral for overall market sentiment]

TIMELINE: [Estimate impact timeline: immediate, short-term, long-term]

SIMILAR_EVENTS: [Reference 1-2 similar historical events if applicable]

Focus on:
- Direct supply chain impacts
- Currency and commodity effects  
- Sector-specific implications
- Regulatory compliance costs
- Consumer demand changes
- International trade disruptions`;
  }

  parseGeoEventResponse(response, originalEvent) {
    try {
      const sections = {};
      
      const patterns = {
        event_type: /EVENT_TYPE:\s*(.+?)(?=\n|$)/i,
        market_impact: /MARKET_IMPACT:\s*([\s\S]*?)(?=\nAFFECTED_TICKERS:|$)/i,
        affected_tickers: /AFFECTED_TICKERS:\s*(.+?)(?=\n|$)/i,
        affected_sectors: /AFFECTED_SECTORS:\s*(.+?)(?=\n|$)/i,
        affected_countries: /AFFECTED_COUNTRIES:\s*(.+?)(?=\n|$)/i,
        risk_score: /RISK_SCORE:\s*(.+?)(?=\n|$)/i,
        sentiment: /SENTIMENT:\s*(.+?)(?=\n|$)/i,
        timeline: /TIMELINE:\s*(.+?)(?=\n|$)/i,
        similar_events: /SIMILAR_EVENTS:\s*([\s\S]*?)(?=\n[A-Z_]+:|$)/i
      };

      for (const [key, pattern] of Object.entries(patterns)) {
        const match = response.match(pattern);
        sections[key] = match ? match[1].trim() : '';
      }

      // Parse comma-separated lists
      const affectedTickers = (sections.affected_tickers || '')
        .split(',')
        .map(ticker => ticker.trim().toUpperCase())
        .filter(ticker => ticker.length > 0);

      const affectedSectors = (sections.affected_sectors || '')
        .split(',')
        .map(sector => sector.trim())
        .filter(sector => sector.length > 0);

      const affectedCountries = (sections.affected_countries || '')
        .split(',')
        .map(country => country.trim())
        .filter(country => country.length > 0);

      // Clean sentiment
      let sentiment = (sections.sentiment || 'neutral').toLowerCase();
      if (!['positive', 'negative', 'neutral'].includes(sentiment)) {
        sentiment = 'neutral';
      }

      // Parse risk score
      const riskScore = Math.max(0, Math.min(100, 
        parseInt(sections.risk_score) || 50));

      // Determine if this should be an alert (high risk score)
      const isAlert = riskScore >= 70;

      return {
        event_title: originalEvent.title,
        event_type: sections.event_type || 'other',
        description: sections.market_impact || originalEvent.description,
        affected_tickers: affectedTickers,
        affected_sectors: affectedSectors,
        affected_countries: affectedCountries,
        risk_score: riskScore,
        sentiment,
        source_url: originalEvent.url || null,
        event_date: originalEvent.date || new Date().toISOString().split('T')[0],
        is_alert: isAlert,
        timeline: sections.timeline || 'unknown',
        similar_events: sections.similar_events || ''
      };
    } catch (error) {
      console.error('Error parsing geo-event response:', error);
      
      return {
        event_title: originalEvent.title,
        event_type: 'other',
        description: originalEvent.description,
        affected_tickers: [],
        affected_sectors: [],
        affected_countries: [],
        risk_score: 50,
        sentiment: 'neutral',
        source_url: originalEvent.url || null,
        event_date: originalEvent.date || new Date().toISOString().split('T')[0],
        is_alert: false,
        timeline: 'unknown',
        similar_events: ''
      };
    }
  }
}

module.exports = AIAnalysisService;