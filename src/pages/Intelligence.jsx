import { useEffect, useState } from "react";
import IntelligenceWidget from '../components/IntelligenceWidget';
import AIChatbot from '../components/AIChatbot';

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

function FedTracker({ fedData, selectedMeeting, setSelectedMeeting }) {
  if (!fedData) return null;

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl p-6 shadow-sm border border-blue-200">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
            <span className="text-2xl">🏛️</span>
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Federal Reserve Tracker</h3>
            <p className="text-sm text-blue-700">FOMC Meeting Intelligence</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-blue-600 font-semibold">Next Meeting</div>
          <div className="text-lg font-bold text-gray-900">{fedData.nextMeeting?.date}</div>
        </div>
      </div>

      {/* Next Meeting */}
      <div className="bg-white rounded-xl p-5 mb-6 border border-blue-200">
        <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
          📅 Upcoming: {fedData.nextMeeting?.type}
        </h4>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            <span className="text-sm text-gray-700">Date: {fedData.nextMeeting?.date}</span>
          </div>
          <div className="mt-3">
            <div className="text-sm font-semibold text-gray-800 mb-2">Expected Topics:</div>
            <div className="flex flex-wrap gap-2">
              {fedData.nextMeeting?.expectedTopics?.map((topic, idx) => (
                <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                  {topic}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Meeting History Toggle */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-3">
          <h4 className="font-bold text-gray-900">Recent Meetings</h4>
          <span className="text-sm text-gray-600">({fedData.recentMeetings?.length || 0} meetings)</span>
        </div>
        <div className="flex gap-2">
          {fedData.recentMeetings?.map((meeting, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedMeeting(idx)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedMeeting === idx
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-blue-50'
              }`}
            >
              {meeting.date}
            </button>
          ))}
        </div>
      </div>

      {/* Selected Meeting Details */}
      {fedData.recentMeetings?.[selectedMeeting] && (
        <div className="bg-white rounded-xl p-5 border border-blue-200">
          <div className="flex items-start justify-between mb-4">
            <h5 className="font-bold text-gray-900">
              {fedData.recentMeetings[selectedMeeting].date} Meeting
            </h5>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
              fedData.recentMeetings[selectedMeeting].rateChange?.includes('increase') ? 'bg-red-100 text-red-700' :
              fedData.recentMeetings[selectedMeeting].rateChange?.includes('decrease') ? 'bg-green-100 text-green-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {fedData.recentMeetings[selectedMeeting].rateChange}
            </span>
          </div>
          
          <div className="space-y-4">
            <div>
              <div className="text-sm font-semibold text-gray-800 mb-2">Decision:</div>
              <p className="text-sm text-gray-700">{fedData.recentMeetings[selectedMeeting].decision}</p>
            </div>
            
            <div>
              <div className="text-sm font-semibold text-gray-800 mb-2">Key Discussions:</div>
              <ul className="space-y-1">
                {fedData.recentMeetings[selectedMeeting].keyDiscussions?.map((discussion, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
                    <span className="text-sm text-gray-700">{discussion}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-blue-50 rounded-lg p-3">
              <div className="text-sm font-semibold text-blue-800 mb-1">Market Impact:</div>
              <p className="text-sm text-blue-700">{fedData.recentMeetings[selectedMeeting].marketImpact}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GeoEventAnalyzer({ geoData }) {
  if (!geoData) return null;

  const getRiskColor = (risk) => {
    switch(risk) {
      case 'High': return 'text-red-700 bg-red-100 border-red-300';
      case 'Medium': return 'text-yellow-700 bg-yellow-100 border-yellow-300';
      case 'Low': return 'text-green-700 bg-green-100 border-green-300';
      default: return 'text-gray-700 bg-gray-100 border-gray-300';
    }
  };

  const getRegionFlag = (region) => {
    const flags = {
      'USA': '🇺🇸',
      'China': '🇨🇳',
      'India': '🇮🇳',
      'Europe': '🇪🇺',
      'Global': '🌍'
    };
    return flags[region] || '🌏';
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 card-hover">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
            <span className="text-2xl">🌍</span>
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Geo-Event Risk Analyzer</h3>
            <p className="text-sm text-orange-600">Regional Market Impact Assessment</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-orange-600 font-semibold">Risk Overview</div>
          <div className="text-lg font-bold text-gray-900">{geoData.summary?.highRiskRegions || 0} High Risk</div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {geoData.regions?.map((regionData, idx) => (
          <div key={idx} className="bg-gradient-to-br from-gray-50 to-orange-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{getRegionFlag(regionData.region)}</span>
                <span className="font-bold text-gray-900">{regionData.region}</span>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${getRiskColor(regionData.overallRisk)}`}>
                {regionData.overallRisk}
              </span>
            </div>

            <div className="space-y-3">
              {regionData.events?.slice(0, 2).map((event, eventIdx) => (
                <div key={eventIdx} className="bg-white rounded-lg p-3 shadow-sm">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-gray-900 text-sm line-clamp-2">{event.title}</h4>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getRiskColor(event.riskLevel)}`}>
                      {event.riskLevel}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mb-2 line-clamp-2">{event.description}</p>
                  <div className="text-xs text-orange-700 bg-orange-50 rounded p-2">
                    <strong>Impact:</strong> {event.marketImpact}
                  </div>
                  {event.affectedSectors && event.affectedSectors.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {event.affectedSectors.slice(0, 2).map((sector, sectorIdx) => (
                        <span key={sectorIdx} className="bg-orange-100 text-orange-600 px-2 py-1 rounded text-xs">
                          {sector}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between text-sm text-gray-500">
        <span>{geoData.summary?.totalEvents || 0} events analyzed</span>
        <span>Updated: {geoData.summary?.lastUpdated ? new Date(geoData.summary.lastUpdated).toLocaleTimeString() : 'Unknown'}</span>
      </div>
    </div>
  );
}

function EconomicIndicators({ indicators }) {
  if (!indicators) return null;

  const getTrendIcon = (trend) => {
    switch(trend) {
      case 'rising': return '📈';
      case 'falling': return '📉';
      default: return '➡️';
    }
  };

  const getTrendColor = (trend) => {
    switch(trend) {
      case 'rising': return 'text-red-600 bg-red-50';
      case 'falling': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {/* Mortgage Rates */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <span className="text-xl">🏠</span>
            </div>
            <div>
              <h4 className="font-bold text-gray-900">Mortgage Rates</h4>
              <p className="text-xs text-gray-600">Nationwide Average</p>
            </div>
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getTrendColor(indicators.mortgageRates?.trend)}`}>
            {getTrendIcon(indicators.mortgageRates?.trend)} {indicators.mortgageRates?.trend}
          </span>
        </div>
        
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">30-Year Fixed</span>
            <span className="text-lg font-bold text-gray-900">{indicators.mortgageRates?.thirtyYear}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">15-Year Fixed</span>
            <span className="text-lg font-bold text-gray-900">{indicators.mortgageRates?.fifteenYear}</span>
          </div>
          <div className="bg-orange-50 rounded-lg p-3 mt-4">
            <p className="text-xs text-orange-700">{indicators.mortgageRates?.impact}</p>
          </div>
        </div>
      </div>

      {/* Oil Prices */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <span className="text-xl">🛢️</span>
            </div>
            <div>
              <h4 className="font-bold text-gray-900">Oil Prices</h4>
              <p className="text-xs text-gray-600">Per Barrel</p>
            </div>
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getTrendColor(indicators.oilPrices?.trend)}`}>
            {getTrendIcon(indicators.oilPrices?.trend)} {indicators.oilPrices?.trend}
          </span>
        </div>
        
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">WTI Crude</span>
            <span className="text-lg font-bold text-gray-900">{indicators.oilPrices?.wti}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Brent Crude</span>
            <span className="text-lg font-bold text-gray-900">{indicators.oilPrices?.brent}</span>
          </div>
          <div className="bg-yellow-50 rounded-lg p-3 mt-4">
            <p className="text-xs text-yellow-700">{indicators.oilPrices?.impact}</p>
          </div>
        </div>
      </div>

      {/* Inflation Rate */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-xl">💰</span>
            </div>
            <div>
              <h4 className="font-bold text-gray-900">Inflation Rate</h4>
              <p className="text-xs text-gray-600">Consumer Price Index</p>
            </div>
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getTrendColor(indicators.inflation?.trend)}`}>
            {getTrendIcon(indicators.inflation?.trend)} {indicators.inflation?.trend}
          </span>
        </div>
        
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Current Rate</span>
            <span className="text-lg font-bold text-gray-900">{indicators.inflation?.rate}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Fed Target</span>
            <span className="text-lg font-bold text-green-600">{indicators.inflation?.target}</span>
          </div>
          <div className="bg-purple-50 rounded-lg p-3 mt-4">
            <p className="text-xs text-purple-700">{indicators.inflation?.impact}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Intelligence() {
  const [techBoardNews, setTechBoardNews] = useState([]);
  const [fedData, setFedData] = useState(null);
  const [economicIndicators, setEconomicIndicators] = useState(null);
  const [geoEventsData, setGeoEventsData] = useState(null);
  const [loadingTech, setLoadingTech] = useState(true);
  const [loadingFed, setLoadingFed] = useState(true);
  const [loadingEconomic, setLoadingEconomic] = useState(true);
  const [loadingGeoEvents, setLoadingGeoEvents] = useState(true);
  const [selectedMeeting, setSelectedMeeting] = useState(0);
  
  useEffect(() => {
    const fetchData = async () => {
      // Fetch tech board news
      try {
        setLoadingTech(true);
        const techNews = await fetchJSON('https://marketpulse-2025-2.onrender.com/api/intelligence/tech-board');
        setTechBoardNews(techNews);
      } catch (error) {
        console.error('Error fetching tech board news:', error);
        setTechBoardNews([]);
      } finally {
        setLoadingTech(false);
      }

      // Fetch FED data
      try {
        setLoadingFed(true);
        const fed = await fetchJSON('https://marketpulse-2025-2.onrender.com/api/intelligence/fed-tracker');
        setFedData(fed);
      } catch (error) {
        console.error('Error fetching FED data:', error);
        setFedData(null);
      } finally {
        setLoadingFed(false);
      }

      // Fetch economic indicators
      try {
        setLoadingEconomic(true);
        const indicators = await fetchJSON('https://marketpulse-2025-2.onrender.com/api/intelligence/economic-indicators');
        setEconomicIndicators(indicators);
      } catch (error) {
        console.error('Error fetching economic indicators:', error);
        setEconomicIndicators(null);
      } finally {
        setLoadingEconomic(false);
      }

      // Fetch geo-events data
      try {
        setLoadingGeoEvents(true);
        const geoEvents = await fetchJSON('https://marketpulse-2025-2.onrender.com/api/intelligence/geo-events');
        setGeoEventsData(geoEvents);
      } catch (error) {
        console.error('Error fetching geo-events:', error);
        setGeoEventsData(null);
      } finally {
        setLoadingGeoEvents(false);
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
        {/* Federal Reserve Tracker - MOVED TO TOP */}
        <div className="mb-8">
          {loadingFed ? (
            <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
              <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">Loading FED meeting data...</p>
            </div>
          ) : (
            <FedTracker 
              fedData={fedData} 
              selectedMeeting={selectedMeeting} 
              setSelectedMeeting={setSelectedMeeting} 
            />
          )}
        </div>

        {/* Economic Indicators - MOVED TO TOP */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Economic Indicators</h2>
            <div className="flex items-center gap-2 text-purple-600">
              <div className="w-2 h-2 bg-purple-500 rounded-full pulse-soft"></div>
              <span className="text-sm font-semibold">Gemini Live Data</span>
            </div>
          </div>
          
          {loadingEconomic ? (
            <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
              <div className="animate-spin h-8 w-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">Loading economic indicators...</p>
            </div>
          ) : (
            <EconomicIndicators indicators={economicIndicators} />
          )}
        </div>

        {/* Geo-Event Risk Analyzer */}
        <div className="mb-8">
          {loadingGeoEvents ? (
            <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
              <div className="animate-spin h-8 w-8 border-2 border-orange-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">Analyzing global events...</p>
            </div>
          ) : (
            <GeoEventAnalyzer geoData={geoEventsData} />
          )}
        </div>

        {/* Intelligence Widget */}
        <div className="mb-8">
          <IntelligenceWidget />
        </div>

        {/* AI Financial Tutor Chatbot */}
        <div className="mb-8">
          <AIChatbot />
        </div>

        {/* Tech Board News Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Big Tech Board News</h2>
            <div className="flex items-center gap-2 text-blue-600">
              <div className="w-2 h-2 bg-blue-500 rounded-full pulse-soft"></div>
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
      </div>
    </div>
  );
}