const axios = require('axios');
const cheerio = require('cheerio');
const { parseString } = require('xml2js');
const { promisify } = require('util');
const parseXML = promisify(parseString);

class SECDataService {
  constructor() {
    // SEC EDGAR API base URL
    this.baseURL = 'https://data.sec.gov';
    this.headers = {
      'User-Agent': 'MarketPulse/1.0 (your-email@example.com)',
      'Accept-Encoding': 'gzip, deflate',
      'Host': 'data.sec.gov'
    };
  }

  // Get recent filings for a company by ticker
  async getCompanyFilings(ticker, filingTypes = ['10-K', '10-Q', '8-K'], limit = 10) {
    try {
      // First, get company CIK (Central Index Key)
      const cik = await this.getCIKFromTicker(ticker);
      if (!cik) {
        throw new Error(`Could not find CIK for ticker: ${ticker}`);
      }

      // Get submissions for the company
      const submissionsURL = `${this.baseURL}/submissions/CIK${cik.padStart(10, '0')}.json`;
      const response = await axios.get(submissionsURL, { headers: this.headers });
      
      const { recent } = response.data;
      const filings = [];

      // Process recent filings
      for (let i = 0; i < Math.min(recent.form.length, limit * 3); i++) {
        const form = recent.form[i];
        const filingDate = recent.filingDate[i];
        const accessionNumber = recent.accessionNumber[i];
        const reportDate = recent.reportDate[i];
        
        if (filingTypes.includes(form)) {
          filings.push({
            ticker,
            cik,
            form,
            filingDate,
            reportDate,
            accessionNumber,
            description: recent.primaryDocument[i] || '',
            url: `${this.baseURL}/Archives/edgar/data/${cik}/${accessionNumber.replace(/-/g, '')}/${recent.primaryDocument[i]}`
          });
        }

        if (filings.length >= limit) break;
      }

      return filings.slice(0, limit);
    } catch (error) {
      console.error(`Error fetching SEC filings for ${ticker}:`, error.message);
      throw error;
    }
  }

  // Get CIK from ticker symbol
  async getCIKFromTicker(ticker) {
    try {
      const tickersURL = `${this.baseURL}/files/company_tickers.json`;
      const response = await axios.get(tickersURL, { headers: this.headers });
      
      const companies = Object.values(response.data);
      const company = companies.find(c => 
        c.ticker && c.ticker.toUpperCase() === ticker.toUpperCase()
      );
      
      return company ? company.cik_str.toString() : null;
    } catch (error) {
      console.error(`Error getting CIK for ticker ${ticker}:`, error);
      return null;
    }
  }

  // Extract text content from SEC filing HTML
  async getFilingContent(filingURL) {
    try {
      const response = await axios.get(filingURL, { 
        headers: this.headers,
        timeout: 10000
      });
      
      const $ = cheerio.load(response.data);
      
      // Remove script, style, and other non-content tags
      $('script, style, table').remove();
      
      // Extract meaningful text content
      let content = '';
      
      // Look for common SEC filing sections
      const sections = [
        'business', 'risk factors', 'management discussion',
        'financial statements', 'controls and procedures',
        'legal proceedings', 'market risk'
      ];
      
      // Try to find structured content first
      const businessSection = $('*').filter(function() {
        const text = $(this).text().toLowerCase();
        return sections.some(section => text.includes(section));
      });
      
      if (businessSection.length > 0) {
        businessSection.each(function() {
          const text = $(this).text().trim();
          if (text.length > 100) { // Only include substantial text
            content += text + '\n\n';
          }
        });
      } else {
        // Fallback: extract all paragraph text
        $('p, div').each(function() {
          const text = $(this).text().trim();
          if (text.length > 50) {
            content += text + '\n\n';
          }
        });
      }
      
      // Clean up the content
      content = content
        .replace(/\s+/g, ' ') // Normalize whitespace
        .replace(/\n\s*\n/g, '\n\n') // Clean up line breaks
        .trim();
      
      // Limit content length to prevent overwhelming the AI
      if (content.length > 10000) {
        content = content.substring(0, 10000) + '...';
      }
      
      return content;
    } catch (error) {
      console.error(`Error extracting content from ${filingURL}:`, error.message);
      return null;
    }
  }

  // Get earnings transcripts from free sources
  async getEarningsTranscripts(ticker, limit = 3) {
    try {
      // This would integrate with free sources like Yahoo Finance or SeekingAlpha
      // For now, we'll return a mock structure and focus on SEC filings
      
      const mockTranscripts = [
        {
          ticker,
          title: `${ticker} Q3 2024 Earnings Call`,
          date: new Date().toISOString().split('T')[0],
          source: 'Yahoo Finance',
          url: `https://finance.yahoo.com/quote/${ticker}/`,
          content: `Earnings call transcript for ${ticker} - Q3 2024 results discussion`,
          type: 'earnings_call'
        }
      ];
      
      return mockTranscripts;
    } catch (error) {
      console.error(`Error fetching earnings transcripts for ${ticker}:`, error.message);
      return [];
    }
  }

  // Get comprehensive company data for analysis
  async getCompanyIntelligence(ticker, limit = 5) {
    try {
      const [filings, earnings] = await Promise.all([
        this.getCompanyFilings(ticker, ['10-K', '10-Q', '8-K'], limit),
        this.getEarningsTranscripts(ticker, 2)
      ]);

      // Enrich filings with content where possible
      const enrichedFilings = await Promise.all(
        filings.slice(0, 3).map(async (filing) => { // Limit to 3 to avoid rate limits
          try {
            const content = await this.getFilingContent(filing.url);
            return { ...filing, content };
          } catch (error) {
            console.warn(`Could not fetch content for filing ${filing.accessionNumber}`);
            return filing;
          }
        })
      );

      return {
        ticker,
        filings: enrichedFilings,
        earnings,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Error getting company intelligence for ${ticker}:`, error.message);
      throw error;
    }
  }

  // Helper method to format filing data for AI analysis
  formatForAnalysis(companyData) {
    const { ticker, filings, earnings } = companyData;
    
    let analysisText = `Company: ${ticker}\n\n`;
    
    // Add SEC filings
    if (filings && filings.length > 0) {
      analysisText += "SEC FILINGS:\n";
      filings.forEach((filing, index) => {
        analysisText += `\n[${index + 1}] ${filing.form} - ${filing.filingDate}\n`;
        if (filing.content) {
          analysisText += `Content: ${filing.content.substring(0, 2000)}...\n`;
        }
      });
    }
    
    // Add earnings data
    if (earnings && earnings.length > 0) {
      analysisText += "\n\nEARNINGS CALLS:\n";
      earnings.forEach((earning, index) => {
        analysisText += `\n[${index + 1}] ${earning.title} - ${earning.date}\n`;
        if (earning.content) {
          analysisText += `Content: ${earning.content}\n`;
        }
      });
    }
    
    return analysisText;
  }
}

module.exports = SECDataService;