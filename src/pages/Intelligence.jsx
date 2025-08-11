import { useEffect, useState } from "react";

const fetchJSON = async (url) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
};

function InsightCard({ insight }) {
  const isBoardroom = insight.type === 'boardroom';
  const score = insight.score || 0;
  const sentiment = insight.sentiment || 'neutral';
  
  const sentimentColor = 
    sentiment.toLowerCase() === 'bullish' || sentiment.toLowerCase() === 'positive'
      ? 'text-green-600 bg-green-50 border-green-200' :
    sentiment.toLowerCase() === 'bearish' || sentiment.toLowerCase() === 'negative'
      ? 'text-red-600 bg-red-50 border-red-200' :
    'text-gray-600 bg-gray-50 border-gray-200';
  
  const scoreColor = 
    score >= 70 ? 'text-red-600 bg-red-100' :
    score >= 50 ? 'text-orange-600 bg-orange-100' :
    score >= 30 ? 'text-yellow-600 bg-yellow-100' :
    'text-green-600 bg-green-100';

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`px-3 py-1 rounded-full text-xs font-semibold border ${sentimentColor}`}>
            {sentiment.charAt(0).toUpperCase() + sentiment.slice(1)}
          </div>
          <div className={`px-2 py-1 rounded text-xs font-bold ${scoreColor}`}>
            {score}/100
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            isBoardroom 
              ? 'bg-blue-100 text-blue-700' 
              : 'bg-purple-100 text-purple-700'
          }`}>
            {isBoardroom ? 'Boardroom' : 'Geo-Political'}
          </span>
          {insight.ticker && (
            <span className="text-xs font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded">
              {insight.ticker}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="mb-4">
        <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-2">
          {insight.title || insight.event_title}
        </h3>
        <p className="text-gray-700 text-sm line-clamp-3">
          {insight.summary || insight.description}
        </p>
      </div>

      {/* Key Points or Affected Areas */}
      {insight.key_points && insight.key_points.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-gray-800 mb-2">Key Insights:</h4>
          <ul className="text-xs text-gray-600 space-y-1">
            {insight.key_points.slice(0, 3).map((point, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-blue-500 mt-1">•</span>
                <span className="line-clamp-2">{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Affected Sectors/Tickers for Geo Events */}
      {insight.type === 'geo-event' && (
        <div className="mb-4">
          {insight.affected_sectors && insight.affected_sectors.length > 0 && (
            <div className="mb-2">
              <span className="text-xs font-medium text-gray-600">Sectors: </span>
              {insight.affected_sectors.slice(0, 3).map((sector, idx) => (
                <span key={idx} className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded mr-1 mb-1">
                  {sector}
                </span>
              ))}
            </div>
          )}
          
          {insight.affected_tickers && insight.affected_tickers.length > 0 && (
            <div>
              <span className="text-xs font-medium text-gray-600">Stocks: </span>
              {insight.affected_tickers.slice(0, 5).map((ticker, idx) => (
                <span key={idx} className="inline-block bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded mr-1 mb-1 font-mono">
                  {ticker}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100">
        <span>
          {new Date(insight.created_at || insight.event_date).toLocaleDateString()}
        </span>
        {insight.confidence_score && (
          <span>
            Confidence: {Math.round(insight.confidence_score * 100)}%
          </span>
        )}
        {insight.source_url && (
          <a 
            href={insight.source_url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-700 transition-colors"
          >
            Source →
          </a>
        )}
      </div>
    </div>
  );
}

function AlertBanner({ alerts }) {
  if (!alerts || alerts.length === 0) return null;

  return (
    <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
        <h3 className="font-bold text-red-800">High-Impact Alerts</h3>
        <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-semibold">
          {alerts.length}
        </span>
      </div>
      
      <div className="space-y-2">
        {alerts.slice(0, 3).map((alert, idx) => (
          <div key={idx} className="bg-white p-3 rounded-lg border border-red-100">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-semibold text-red-900 text-sm mb-1">
                  {alert.event_title}
                </h4>
                <p className="text-red-700 text-xs line-clamp-2">
                  {alert.description}
                </p>
              </div>
              <div className="ml-3 flex items-center gap-2">
                <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">
                  {alert.risk_score}/100
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Intelligence() {
  const [intelligenceData, setIntelligenceData] = useState(null);
  const [boardroomData, setBoardroomData] = useState([]);
  const [geoEvents, setGeoEvents] = useState([]);
  const [newsInsights, setNewsInsights] = useState([]);
  const [trendingTopics, setTrendingTopics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    const fetchIntelligenceData = async () => {
      try {
        setLoading(true);
        
        const [intelligence, boardroom, geoEventsData, newsData, trending] = await Promise.all([
          fetchJSON("http://localhost:5000/api/intelligence?limit=10"),
          fetchJSON("http://localhost:5000/api/boardroom?ticker=AAPL&limit=5"),
          fetchJSON("http://localhost:5000/api/geo-events?limit=10"),
          fetchJSON("http://localhost:5000/api/news?ticker=stock%20market").then(news => 
            news.map(article => ({
              ...article,
              type: 'news',
              score: article.sentiment === 'Positive' ? 75 : article.sentiment === 'Negative' ? 25 : 50,
              impact_score: article.sentiment === 'Positive' ? 75 : article.sentiment === 'Negative' ? 25 : 50,
              title: article.title,
              summary: article.summary,
              sentiment: article.sentiment.toLowerCase(),
              source_url: article.url,
              created_at: article.publishedAt || new Date().toISOString()
            }))
          ),
          fetchJSON("http://localhost:5000/api/boardroom/trending?tickers=AAPL,MSFT,GOOGL,TSLA,NVDA").catch(() => null)
        ]);

        setIntelligenceData(intelligence);
        setBoardroomData(boardroom);
        setGeoEvents(geoEventsData);
        setNewsInsights(newsData);
        setTrendingTopics(trending);
      } catch (error) {
        console.error('Error fetching intelligence data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchIntelligenceData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 shadow-sm">
          <div className="animate-pulse flex space-x-4">
            <div className="rounded-full bg-gray-200 h-12 w-12"></div>
            <div className="flex-1 space-y-2 py-1">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
          <p className="text-center text-gray-600 mt-4">Loading Intelligence...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Market Intelligence</h1>
              <p className="text-gray-600 mt-1">AI-powered insights from boardrooms and global events</p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-purple-600">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-semibold">AI Powered</span>
              </div>
              
              {intelligenceData?.summary && (
                <div className="text-right text-sm text-gray-600">
                  <div>{intelligenceData.summary.totalInsights} Total Insights</div>
                  <div className="text-xs">
                    Updated: {new Date(intelligenceData.summary.lastUpdated).toLocaleString()}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Navigation Tabs */}
          <div className="flex gap-1 mt-4 bg-gray-100 rounded-lg p-1 w-fit">
            {[
              { id: 'dashboard', label: 'Dashboard' },
              { id: 'news', label: 'News AI Insights' },
              { id: 'boardroom', label: 'Boardroom Intel' },
              { id: 'geopolitical', label: 'Geo-Political' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 max-w-7xl mx-auto">
        {/* Alerts */}
        {intelligenceData?.alerts && (
          <AlertBanner alerts={intelligenceData.alerts} />
        )}

        {/* Dashboard View */}
        {activeTab === 'dashboard' && intelligenceData && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Top Intelligence Insights</h2>
            <div className="grid gap-6 lg:grid-cols-2">
              {intelligenceData.topInsights.map((insight, idx) => (
                <InsightCard key={idx} insight={insight} />
              ))}
            </div>
          </div>
        )}

        {/* News AI Insights View */}
        {activeTab === 'news' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">News AI Insights</h2>
              <div className="text-sm text-gray-600 flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                AI-powered news analysis & sentiment
              </div>
            </div>
            
            {/* Market Sentiment Overview */}
            {newsInsights.length > 0 && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 mb-6 border border-blue-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Market Sentiment Overview</h3>
                  <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-semibold">
                    {newsInsights.length} Articles Analyzed
                  </span>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  {['positive', 'negative', 'neutral'].map(sentiment => {
                    const count = newsInsights.filter(n => n.sentiment === sentiment).length;
                    const percentage = Math.round((count / newsInsights.length) * 100);
                    const color = sentiment === 'positive' ? 'text-green-600 bg-green-100' : 
                                 sentiment === 'negative' ? 'text-red-600 bg-red-100' : 
                                 'text-gray-600 bg-gray-100';
                    
                    return (
                      <div key={sentiment} className="text-center">
                        <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-2 ${color}`}>
                          <span className="text-2xl font-bold">{count}</span>
                        </div>
                        <div className="text-sm font-medium text-gray-900 capitalize">{sentiment}</div>
                        <div className="text-xs text-gray-600">{percentage}%</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            <div className="grid gap-6 lg:grid-cols-2">
              {newsInsights.map((insight, idx) => (
                <div key={idx} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                        insight.sentiment === 'positive' 
                          ? 'text-green-600 bg-green-50 border-green-200' :
                        insight.sentiment === 'negative'
                          ? 'text-red-600 bg-red-50 border-red-200' :
                        'text-gray-600 bg-gray-50 border-gray-200'
                      }`}>
                        {insight.sentiment.charAt(0).toUpperCase() + insight.sentiment.slice(1)}
                      </div>
                      <div className={`px-2 py-1 rounded text-xs font-bold ${
                        insight.score >= 70 ? 'text-red-600 bg-red-100' :
                        insight.score >= 50 ? 'text-orange-600 bg-orange-100' :
                        'text-green-600 bg-green-100'
                      }`}>
                        {insight.score}/100
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full text-xs font-medium">
                        News AI
                      </span>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {insight.source}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="mb-4">
                    <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-2">
                      {insight.title}
                    </h3>
                    <p className="text-gray-700 text-sm line-clamp-3">
                      {insight.summary}
                    </p>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100">
                    <span>
                      {new Date(insight.created_at).toLocaleDateString()}
                    </span>
                    {insight.source_url && (
                      <a 
                        href={insight.source_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-700 transition-colors"
                      >
                        Read Article →
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Boardroom Intelligence View */}
        {activeTab === 'boardroom' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Boardroom Intelligence</h2>
              <div className="text-sm text-gray-600">
                Enhanced news-based analysis & trending topics
              </div>
            </div>
            
            {/* Trending Topics Section */}
            {trendingTopics && trendingTopics.trending_topics && (
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl p-6 mb-6 border border-purple-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Trending Boardroom Topics</h3>
                  <div className="flex items-center gap-2">
                    <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-semibold">
                      {trendingTopics.total_insights} Total Insights
                    </span>
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {trendingTopics.trending_topics.map((topic, idx) => (
                    <div key={idx} className="bg-white rounded-lg p-4 text-center shadow-sm border border-purple-100">
                      <div className="text-2xl font-bold text-purple-600 mb-1">{topic.count}</div>
                      <div className="text-sm font-medium text-gray-900">{topic.topic}</div>
                    </div>
                  ))}
                </div>
                
                <div className="text-xs text-gray-500 mt-4 text-center">
                  Last updated: {new Date(trendingTopics.last_updated).toLocaleString()}
                </div>
              </div>
            )}
            
            <div className="grid gap-6 lg:grid-cols-2">
              {boardroomData.map((insight, idx) => (
                <InsightCard key={idx} insight={{ ...insight, type: 'boardroom', score: insight.impact_score }} />
              ))}
            </div>
          </div>
        )}

        {/* Geo-Political View */}
        {activeTab === 'geopolitical' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Geo-Political Risk Analysis</h2>
              <div className="text-sm text-gray-600">
                Global events & market impact
              </div>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              {geoEvents.map((event, idx) => (
                <InsightCard key={idx} insight={{ ...event, type: 'geo-event', score: event.risk_score }} />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {((activeTab === 'dashboard' && (!intelligenceData?.topInsights || intelligenceData.topInsights.length === 0)) ||
          (activeTab === 'news' && newsInsights.length === 0) ||
          (activeTab === 'boardroom' && boardroomData.length === 0) ||
          (activeTab === 'geopolitical' && geoEvents.length === 0)) && (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Intelligence Data</h3>
            <p className="text-gray-600 mb-4">
              Intelligence insights will appear here as they become available.
            </p>
            <p className="text-xs text-gray-500">
              Check back in a few minutes as our AI analyzes the latest market data.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}