import { useEffect, useState } from 'react';

const fetchJSON = async (url) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
};

export default function IntelligenceWidget({ onViewAll }) {
  const [intelligenceData, setIntelligenceData] = useState(null);
  const [newsInsights, setNewsInsights] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchIntelligence = async () => {
      try {
        const [intelligence, news] = await Promise.all([
          fetchJSON("https://marketpulse-2025-2.onrender.com/api/intelligence?limit=3"),
          fetchJSON("https://marketpulse-2025-2.onrender.com/api/news?ticker=stock%20market").then(articles => 
            articles.slice(0, 3).map(article => ({
              ...article,
              type: 'news',
              score: article.sentiment === 'Positive' ? 75 : article.sentiment === 'Negative' ? 25 : 50,
              title: article.title,
              summary: article.summary,
              sentiment: article.sentiment.toLowerCase(),
              source: article.source
            }))
          )
        ]);
        
        setIntelligenceData(intelligence);
        setNewsInsights(news);
      } catch (error) {
        console.error('Error fetching intelligence data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchIntelligence();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  // Choose the best insight from either intelligence data or news
  const getBestInsight = () => {
    const insights = [];
    
    if (intelligenceData?.topInsights?.length > 0) {
      insights.push(...intelligenceData.topInsights);
    }
    
    if (newsInsights.length > 0) {
      insights.push(...newsInsights);
    }
    
    return insights.length > 0 ? insights[0] : null;
  };

  const topInsight = getBestInsight();

  if (!topInsight) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Market Intelligence</h3>
          <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs font-semibold">
            AI
          </span>
        </div>
        <p className="text-gray-500 text-sm">
          Intelligence insights will appear here as they become available.
        </p>
      </div>
    );
  }

  const score = topInsight.score || 0;
  const sentiment = topInsight.sentiment || 'neutral';
  
  const sentimentColor = 
    sentiment.toLowerCase() === 'bullish' || sentiment.toLowerCase() === 'positive'
      ? 'text-green-600' :
    sentiment.toLowerCase() === 'bearish' || sentiment.toLowerCase() === 'negative'
      ? 'text-red-600' :
    'text-gray-600';

  const scoreColor = 
    score >= 70 ? 'text-red-600 bg-red-100' :
    score >= 50 ? 'text-orange-600 bg-orange-100' :
    'text-green-600 bg-green-100';

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Latest Intelligence</h3>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
            topInsight.type === 'news' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
          }`}>
            {topInsight.type === 'news' ? 'News AI' : 'AI'}
          </span>
          {intelligenceData?.alerts && intelligenceData.alerts.length > 0 && (
            <div className="flex items-center gap-1 bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-semibold">
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>
              {intelligenceData.alerts.length}
            </div>
          )}
        </div>
      </div>

      {/* Top Insight */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${sentimentColor}`}>
            {sentiment.charAt(0).toUpperCase() + sentiment.slice(1)}
          </span>
          <span className={`px-2 py-1 rounded text-xs font-bold ${scoreColor}`}>
            {score}/100
          </span>
          {topInsight.ticker && (
            <span className="text-xs font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded">
              {topInsight.ticker}
            </span>
          )}
        </div>

        <h4 className="font-medium text-gray-900 mb-2 line-clamp-2">
          {topInsight.title || topInsight.event_title}
        </h4>
        
        <p className="text-sm text-gray-600 line-clamp-2">
          {topInsight.summary || topInsight.description}
        </p>
      </div>

      {/* Summary Stats */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100 text-xs text-gray-500">
        <span>
          {(intelligenceData?.summary?.totalInsights || 0) + newsInsights.length} total insights
        </span>
        <button 
          className="text-green-600 hover:text-green-700 font-medium transition-colors"
          onClick={() => onViewAll && onViewAll('intelligence')}
        >
          View All →
        </button>
      </div>
    </div>
  );
}