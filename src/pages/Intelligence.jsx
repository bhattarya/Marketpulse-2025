import { useEffect, useState } from "react";
import IntelligenceWidget from '../components/IntelligenceWidget';

const fetchJSON = async (url) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
};

function TechBoardCard({ article }) {
  const getCategoryColor = (category) => {
    switch(category) {
      case 'governance': return 'bg-blue-100 text-blue-700';
      case 'strategy': return 'bg-purple-100 text-purple-700';
      case 'executive': return 'bg-green-100 text-green-700';
      case 'financial': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getCategoryColor(article.boardAnalysis?.category)}`}>
            {article.boardAnalysis?.category || 'General'}
          </span>
          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getPriorityColor(article.boardAnalysis?.priority)}`}>
            {article.boardAnalysis?.priority || 'Medium'}
          </span>
        </div>
        <div className="text-right text-xs text-gray-500">
          <p className="font-medium">{article.source}</p>
          <p>{article.publishedAt ? new Date(article.publishedAt).toLocaleDateString() : "—"}</p>
        </div>
      </div>
      
      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block hover:text-green-600 transition-colors"
      >
        <h3 className="font-bold text-gray-900 mb-3 line-clamp-2">{article.title}</h3>
        <div className="bg-indigo-50 rounded-lg p-4 mb-4">
          <h4 className="text-sm font-semibold text-indigo-800 mb-2">Board Impact Analysis</h4>
          <p className="text-sm text-indigo-700">{article.boardAnalysis?.boardImpact || 'Analysis unavailable'}</p>
        </div>
      </a>
    </div>
  );
}

function TariffCard({ tariffData }) {
  const getCountryFlag = (country) => {
    const flags = {
      'CHINA': '🇨🇳',
      'INDIA': '🇮🇳',
      'JAPAN': '🇯🇵',
      'UK': '🇬🇧',
      'KOREA': '🇰🇷'
    };
    return flags[country] || '🌏';
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">{getCountryFlag(tariffData.country)}</span>
        <div>
          <h3 className="font-bold text-gray-900">{tariffData.country}</h3>
          <p className="text-sm text-gray-600">Trade & Tariff Status</p>
        </div>
      </div>
      
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-gray-800 mb-2">Current Status</h4>
        <p className="text-sm text-gray-700 line-clamp-2">{tariffData.tariffStatus}</p>
      </div>

      <div className="mb-4">
        <h4 className="text-sm font-semibold text-gray-800 mb-2">Top Developments</h4>
        <ul className="text-xs text-gray-600 space-y-1">
          {tariffData.topDevelopments?.slice(0, 3).map((dev, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></span>
              <span className="line-clamp-1">{dev}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-gray-50 rounded-lg p-3">
        <h4 className="text-xs font-semibold text-gray-800 mb-1">Trade Impact</h4>
        <p className="text-xs text-gray-600 line-clamp-2">{tariffData.tradeImpact}</p>
      </div>
    </div>
  );
}

export default function Intelligence() {
  const [techBoardNews, setTechBoardNews] = useState([]);
  const [tariffData, setTariffData] = useState([]);
  const [loadingTech, setLoadingTech] = useState(true);
  const [loadingTariffs, setLoadingTariffs] = useState(true);
  
  useEffect(() => {
    const fetchData = async () => {
      // Fetch tech board news
      try {
        setLoadingTech(true);
        const techNews = await fetchJSON('http://localhost:5000/api/intelligence/tech-board');
        setTechBoardNews(techNews);
      } catch (error) {
        console.error('Error fetching tech board news:', error);
        setTechBoardNews([]);
      } finally {
        setLoadingTech(false);
      }

      // Fetch tariff data
      try {
        setLoadingTariffs(true);
        const tariffs = await fetchJSON('http://localhost:5000/api/intelligence/tariffs');
        setTariffData(tariffs);
      } catch (error) {
        console.error('Error fetching tariff data:', error);
        setTariffData([]);
      } finally {
        setLoadingTariffs(false);
      }
    };

    fetchData();
  }, []);

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
                <span className="text-sm font-semibold">OpenAI + NewsData.io</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 max-w-7xl mx-auto">
        {/* Intelligence Widget */}
        <div className="mb-8">
          <IntelligenceWidget />
        </div>

        {/* Tech Board News Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Big Tech Board News</h2>
            <div className="flex items-center gap-2 text-blue-600">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-semibold">OpenAI Analysis</span>
            </div>
          </div>
          
          {loadingTech ? (
            <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
              <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">Loading tech board insights...</p>
            </div>
          ) : techBoardNews.length > 0 ? (
            <div className="grid gap-6 lg:grid-cols-2">
              {techBoardNews.map((article, idx) => (
                <TechBoardCard key={idx} article={article} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
              <p className="text-gray-600">No tech board news available at the moment</p>
            </div>
          )}
        </div>

        {/* Global Tariff Tracker */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Global Tariff Tracker</h2>
            <div className="flex items-center gap-2 text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-semibold">Live Updates</span>
            </div>
          </div>
          
          {loadingTariffs ? (
            <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
              <div className="animate-spin h-8 w-8 border-2 border-green-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">Loading global tariff data...</p>
            </div>
          ) : tariffData.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {tariffData.map((data, idx) => (
                <TariffCard key={idx} tariffData={data} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
              <p className="text-gray-600">Tariff data unavailable at the moment</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}