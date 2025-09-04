import { useEffect, useState } from "react";

const fetchJSON = async (url) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
};

// Calculate sentiment impact score based on keywords
const calculateSentimentScore = (text) => {
  const highImpactWords = ['crash', 'surge', 'plunge', 'soar', 'breakthrough', 'collapse', 'rally', 'plummet', 'skyrocket', 'earnings beat', 'earnings miss'];
  const mediumImpactWords = ['rise', 'fall', 'increase', 'decrease', 'growth', 'decline', 'gain', 'loss', 'up', 'down', 'bullish', 'bearish'];
  const lowImpactWords = ['stable', 'steady', 'maintain', 'continue', 'hold', 'flat', 'sideways'];
  
  const content = `${text.title} ${text.summary || text.description || ''}`.toLowerCase();
  
  if (highImpactWords.some(word => content.includes(word))) return 'high';
  if (mediumImpactWords.some(word => content.includes(word))) return 'medium';
  if (lowImpactWords.some(word => content.includes(word))) return 'low';
  
  return 'medium'; // default
};

// normalize news item from NewsAPI/Finnhub → Gemini output (or raw fallback)
const normalizeNews = (n) => ({
  title: n.title ?? "Untitled",
  url: n.url ?? "#",
  image: n.image ?? n.urlToImage ?? "",
  source: typeof n.source === "string" ? n.source : (n.source?.name ?? "Unknown"),
  summary: n.summary ?? n.description ?? "No summary available",
  sentiment: n.sentiment ?? "Neutral",
  sentimentScore: calculateSentimentScore(n),
  publishedAt: n.publishedAt ?? null,
});

function NewsCard({ title, url, image, source, summary, sentiment, publishedAt, isLarge = false }) {
  const sentimentColor = 
    sentiment?.toLowerCase() === 'positive' ? 'text-green-600 bg-green-50' :
    sentiment?.toLowerCase() === 'negative' ? 'text-red-600 bg-red-50' :
    'text-gray-600 bg-gray-50';
    
  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 overflow-hidden ${
      isLarge ? 'lg:col-span-2' : ''
    }`}>
      {image && (
        <div className="relative">
          <img 
            src={image} 
            alt={title}
            className={`w-full object-cover ${isLarge ? 'h-64' : 'h-48'}`}
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
          <div className="absolute top-4 left-4">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${sentimentColor}`}>
              {sentiment || 'Neutral'}
            </span>
          </div>
        </div>
      )}
      
      <div className="p-6">
        <div className="flex items-start justify-between mb-3">
          {!image && (
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${sentimentColor}`}>
              {sentiment || 'Neutral'}
            </span>
          )}
          <div className="text-right text-xs text-gray-500">
            <p className="font-medium">{source}</p>
            <p>{publishedAt ? new Date(publishedAt).toLocaleDateString() : "—"}</p>
          </div>
        </div>
        
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="block hover:text-green-600 transition-colors"
        >
          <h3 className={`font-bold text-gray-900 mb-3 line-clamp-2 ${
            isLarge ? 'text-xl' : 'text-lg'
          }`}>{title}</h3>
          <p className="text-gray-600 text-sm line-clamp-3">{summary}</p>
        </a>
        
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
            <span className="text-xs font-medium text-purple-700">AI Analyzed</span>
          </div>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-600 hover:text-green-700 font-semibold text-sm transition-colors"
          >
            Read More →
          </a>
        </div>
      </div>
    </div>
  );
}

function TickerFilter({ tickers, selectedTicker, onTickerChange }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Filter by Ticker</h3>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onTickerChange('')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            selectedTicker === '' 
              ? 'bg-green-100 text-green-700 border-2 border-green-300' 
              : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
          }`}
        >
          All News
        </button>
        {tickers.map((ticker) => (
          <button
            key={ticker}
            onClick={() => onTickerChange(ticker)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              selectedTicker === ticker 
                ? 'bg-green-100 text-green-700 border-2 border-green-300' 
                : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
            }`}
          >
            {ticker}
          </button>
        ))}
      </div>
    </div>
  );
}

function SentimentFilter({ selectedSentiment, onSentimentChange }) {
  const sentiments = [
    { value: '', label: 'All', color: 'bg-gray-100 text-gray-700' },
    { value: 'high', label: 'High Impact', color: 'bg-red-50 text-red-700' },
    { value: 'medium', label: 'Medium Impact', color: 'bg-yellow-50 text-yellow-700' },
    { value: 'low', label: 'Low Impact', color: 'bg-green-50 text-green-700' }
  ];

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Filter by Sentiment</h3>
      <div className="flex flex-wrap gap-2">
        {sentiments.map((sentiment) => (
          <button
            key={sentiment.value}
            onClick={() => onSentimentChange(sentiment.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 border-2 ${
              selectedSentiment === sentiment.value 
                ? 'border-green-300 ' + sentiment.color
                : 'border-gray-200 ' + sentiment.color + ' hover:border-gray-300'
            }`}
          >
            {sentiment.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function News() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicker, setSelectedTicker] = useState('');
  const [selectedSentiment, setSelectedSentiment] = useState('');

  const tickers = ["AAPL", "TSLA", "NVDA", "MSFT", "GOOGL", "AMZN", "BTC", "ETH"];

  const filteredNews = news.filter(item => {
    const tickerMatch = selectedTicker === '' || item.title.toLowerCase().includes(selectedTicker.toLowerCase());
    const sentimentMatch = selectedSentiment === '' || item.sentimentScore === selectedSentiment;
    return tickerMatch && sentimentMatch;
  });

  useEffect(() => {
    const fetchNews = async () => {
      setLoading(true);
      try {
        // If a specific ticker is selected, fetch news for that ticker
        const ticker = selectedTicker || "TSLA"; // default to TSLA if no filter
        const items = await fetchJSON(`https://marketpulse-2025-2.onrender.com/api/news?ticker=${ticker}`);
        const mapped = (Array.isArray(items) ? items : []).map(normalizeNews);
        setNews(mapped);
      } catch (e) {
        console.error("News fetch error:", e);
        setNews([]);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, [selectedTicker]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Market News</h1>
              <p className="text-gray-600 mt-1">AI-powered financial news with sentiment analysis</p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-purple-600">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-semibold">AI Powered</span>
              </div>
              <div className="text-sm text-gray-500">
                {filteredNews.length} articles
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 max-w-7xl mx-auto">
        {/* Filters */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <TickerFilter 
            tickers={tickers}
            selectedTicker={selectedTicker}
            onTickerChange={setSelectedTicker}
          />
          <SentimentFilter 
            selectedSentiment={selectedSentiment}
            onSentimentChange={setSelectedSentiment}
          />
        </div>

        {/* News Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500"></div>
              <span className="text-gray-600">Loading news...</span>
            </div>
          </div>
        ) : filteredNews.length > 0 ? (
          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
            {filteredNews.map((item, idx) => (
              <NewsCard
                key={idx}
                title={item.title}
                url={item.url}
                image={item.image}
                source={item.source}
                summary={item.summary}
                sentiment={item.sentiment}
                publishedAt={item.publishedAt}
                isLarge={idx === 0} // Make first card larger
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No News Found</h3>
            <p className="text-gray-600 mb-4">
              No articles match your current filters. Try adjusting your ticker or sentiment selection.
            </p>
            <button
              onClick={() => {
                setSelectedTicker('');
                setSelectedSentiment('');
              }}
              className="text-green-600 hover:text-green-700 font-semibold text-sm transition-colors"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}