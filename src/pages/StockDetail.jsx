import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

const fetchJSON = async (url) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
};

function NewsCard({ title, url, source, summary, sentiment, publishedAt }) {
  const sentimentColor = 
    sentiment?.toLowerCase() === 'positive' ? 'text-green-600 bg-green-50' :
    sentiment?.toLowerCase() === 'negative' ? 'text-red-600 bg-red-50' :
    'text-gray-600 bg-gray-50';
    
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between mb-3">
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${sentimentColor}`}>
          {sentiment || 'Neutral'}
        </span>
        <div className="text-right text-xs text-gray-500">
          <p>{source}</p>
          <p>{publishedAt ? new Date(publishedAt).toLocaleDateString() : "—"}</p>
        </div>
      </div>
      
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="block hover:text-green-600 transition-colors"
      >
        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{title}</h3>
        <p className="text-gray-600 text-sm line-clamp-3">{summary}</p>
      </a>
    </div>
  );
}

export default function StockDetail() {
  const { symbol } = useParams();
  const navigate = useNavigate();
  const [stockData, setStockData] = useState(null);
  const [news, setNews] = useState([]);
  const [marketTrend, setMarketTrend] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStockData = async () => {
      try {
        setLoading(true);
        
        // Fetch stock price data
        const stockResponse = await fetchJSON(`https://marketpulse-2025-2.onrender.com/api/stocks?symbol=${symbol}`);
        setStockData(stockResponse);

        // Fetch news for this stock
        const newsResponse = await fetchJSON(`https://marketpulse-2025-2.onrender.com/api/news?ticker=${symbol}`);
        setNews(newsResponse.slice(0, 3)); // Only 3 news items

        // Determine bull/bear trend based on price data
        const changePercent = stockResponse.changePercent || 0;
        const trend = {
          direction: changePercent > 2 ? 'bullish' : changePercent < -2 ? 'bearish' : 'neutral',
          strength: Math.abs(changePercent) > 5 ? 'strong' : Math.abs(changePercent) > 2 ? 'moderate' : 'weak',
          changePercent: changePercent
        };
        setMarketTrend(trend);

      } catch (error) {
        console.error('Error fetching stock data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (symbol) {
      fetchStockData();
    }
  }, [symbol]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-green-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading {symbol} data...</p>
        </div>
      </div>
    );
  }

  const getTrendColor = (direction) => {
    switch(direction) {
      case 'bullish': return 'text-green-600 bg-green-50';
      case 'bearish': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getTrendEmoji = (direction) => {
    switch(direction) {
      case 'bullish': return '🐂';
      case 'bearish': return '🐻';
      default: return '⚖️';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{symbol}</h1>
                <p className="text-gray-600">Stock Analysis & Market Trend</p>
              </div>
            </div>
            
            {marketTrend && (
              <div className={`px-4 py-2 rounded-lg ${getTrendColor(marketTrend.direction)}`}>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{getTrendEmoji(marketTrend.direction)}</span>
                  <div>
                    <div className="font-bold text-lg">{marketTrend.direction.toUpperCase()}</div>
                    <div className="text-sm">{marketTrend.strength} trend</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Price Data & Chart */}
          <div className="lg:col-span-2">
            {/* Price Info */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Price Overview</h2>
                <div className="text-right">
                  <div className="text-3xl font-bold text-gray-900">
                    ${stockData?.price ? Number(stockData.price).toFixed(2) : '--'}
                  </div>
                  <div className={`text-lg font-semibold ${
                    stockData?.changePercent > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {stockData?.changePercent ? `${stockData.changePercent > 0 ? '+' : ''}${stockData.changePercent.toFixed(2)}%` : '--'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600">Open</div>
                  <div className="text-lg font-semibold">${stockData?.open ? Number(stockData.open).toFixed(2) : '--'}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600">High</div>
                  <div className="text-lg font-semibold">${stockData?.high ? Number(stockData.high).toFixed(2) : '--'}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600">Low</div>
                  <div className="text-lg font-semibold">${stockData?.low ? Number(stockData.low).toFixed(2) : '--'}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600">Prev Close</div>
                  <div className="text-lg font-semibold">${stockData?.prevClose ? Number(stockData.prevClose).toFixed(2) : '--'}</div>
                </div>
              </div>
            </div>

            {/* Chart Placeholder */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Price Chart</h3>
              <div className="h-80 bg-gradient-to-br from-green-50 to-blue-50 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <p className="text-gray-600">Interactive chart coming soon</p>
                  <p className="text-sm text-gray-500">Real-time price movements and technical indicators</p>
                </div>
              </div>
            </div>
          </div>

          {/* Market Trend Analysis & News */}
          <div className="space-y-6">
            {/* Market Trend Analysis */}
            {marketTrend && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Market Trend</h3>
                
                <div className={`p-4 rounded-lg mb-4 ${getTrendColor(marketTrend.direction)}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-3xl">{getTrendEmoji(marketTrend.direction)}</span>
                    <div>
                      <div className="font-bold text-xl">{marketTrend.direction.toUpperCase()}</div>
                      <div className="text-sm opacity-80">{marketTrend.strength} trend</div>
                    </div>
                  </div>
                  
                  <div className="text-sm">
                    <p className="mb-2">
                      <strong>Change:</strong> {marketTrend.changePercent > 0 ? '+' : ''}{marketTrend.changePercent.toFixed(2)}%
                    </p>
                    <p>
                      {marketTrend.direction === 'bullish' && 'Price showing upward momentum with positive investor sentiment.'}
                      {marketTrend.direction === 'bearish' && 'Price under downward pressure with negative market sentiment.'}
                      {marketTrend.direction === 'neutral' && 'Price showing sideways movement with mixed market sentiment.'}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Trend Strength:</span>
                    <span className="font-semibold">{marketTrend.strength}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Market Direction:</span>
                    <span className="font-semibold">{marketTrend.direction}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Related News */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Related News</h3>
              <div className="space-y-4">
                {news.length > 0 ? news.map((item, idx) => (
                  <NewsCard
                    key={idx}
                    title={item.title}
                    url={item.url}
                    source={item.source}
                    summary={item.summary}
                    sentiment={item.sentiment}
                    publishedAt={item.publishedAt}
                  />
                )) : (
                  <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
                    <p className="text-gray-600">No recent news available for {symbol}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}