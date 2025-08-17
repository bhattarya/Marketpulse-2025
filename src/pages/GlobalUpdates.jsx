import { useEffect, useState } from "react";

const fetchJSON = async (url) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
};

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
        <span className="text-3xl">{getCountryFlag(tariffData.country)}</span>
        <div>
          <h3 className="font-bold text-gray-900 text-xl">{tariffData.country}</h3>
          <p className="text-sm text-gray-600">Trade & Tariff Status</p>
        </div>
      </div>
      
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-gray-800 mb-2">Current Status</h4>
        <p className="text-sm text-gray-700">{tariffData.tariffStatus}</p>
      </div>

      <div className="mb-4">
        <h4 className="text-sm font-semibold text-gray-800 mb-2">Top 5 Developments</h4>
        <ul className="text-sm text-gray-600 space-y-2">
          {tariffData.topDevelopments?.map((dev, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
              <span>{dev}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
        <h4 className="text-sm font-semibold text-blue-800 mb-2">Market Impact</h4>
        <p className="text-sm text-blue-700">{tariffData.tradeImpact}</p>
      </div>
    </div>
  );
}

function GlobalNewsCard({ article, country }) {
  const getCountryColor = (country) => {
    const colors = {
      'CHINA': 'bg-red-100 text-red-700',
      'INDIA': 'bg-orange-100 text-orange-700',
      'JAPAN': 'bg-pink-100 text-pink-700',
      'UK': 'bg-blue-100 text-blue-700',
      'KOREA': 'bg-purple-100 text-purple-700'
    };
    return colors[country] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between mb-3">
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getCountryColor(country)}`}>
          {country}
        </span>
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
        <p className="text-gray-600 text-sm line-clamp-3">{article.summary}</p>
      </a>
      
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-xs font-medium text-green-700">Global Impact</span>
        </div>
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-green-600 hover:text-green-700 font-semibold text-sm transition-colors"
        >
          Read More →
        </a>
      </div>
    </div>
  );
}

function CountryFilter({ countries, selectedCountry, onCountryChange }) {
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
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Filter by Country</h3>
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => onCountryChange('')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            selectedCountry === '' 
              ? 'bg-green-100 text-green-700 border-2 border-green-300' 
              : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
          }`}
        >
          🌍 All Countries
        </button>
        {countries.map((country) => (
          <button
            key={country}
            onClick={() => onCountryChange(country)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
              selectedCountry === country 
                ? 'bg-green-100 text-green-700 border-2 border-green-300' 
                : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
            }`}
          >
            <span>{getCountryFlag(country)}</span>
            {country}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function GlobalUpdates() {
  const [tariffData, setTariffData] = useState([]);
  const [globalNews, setGlobalNews] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [loadingTariffs, setLoadingTariffs] = useState(true);
  const [loadingNews, setLoadingNews] = useState(true);

  const countries = ['CHINA', 'INDIA', 'JAPAN', 'UK', 'KOREA'];

  const filteredNews = globalNews.filter(item => 
    selectedCountry === '' || item.country === selectedCountry
  );

  useEffect(() => {
    const fetchData = async () => {
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

      // Fetch global news for each country
      try {
        setLoadingNews(true);
        const allNews = [];
        
        for (const country of countries) {
          try {
            // Using NewsData.io for global news
            const newsRes = await fetchJSON(`http://localhost:5000/api/news/global?country=${country}`);
            const countryNews = newsRes.map(article => ({
              ...article,
              country: country
            }));
            allNews.push(...countryNews);
          } catch (error) {
            console.warn(`Failed to fetch news for ${country}`);
          }
        }
        
        setGlobalNews(allNews);
      } catch (error) {
        console.error('Error fetching global news:', error);
        setGlobalNews([]);
      } finally {
        setLoadingNews(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">Global Updates</h1>
              <p className="text-blue-100 text-lg">Trade policies, tariffs, and international market developments</p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-blue-200">
                <div className="w-3 h-3 bg-blue-300 rounded-full animate-pulse"></div>
                <span className="text-sm font-semibold">Live Global Intelligence</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 max-w-7xl mx-auto">
        {/* USA Tariff Information */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-4xl">🇺🇸</span>
            <div>
              <h2 className="text-3xl font-bold text-gray-900">USA Trade & Tariff Policy</h2>
              <p className="text-gray-600">Top 5 sector-specific tariff developments</p>
            </div>
          </div>
          
          {loadingTariffs ? (
            <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
              <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">Loading USA tariff data...</p>
            </div>
          ) : tariffData.length > 0 ? (
            <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
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

        {/* Global News Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-3xl">🌍</span>
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Global Market News</h2>
              <p className="text-gray-600">International developments affecting global markets</p>
            </div>
          </div>

          {/* Country Filter */}
          <div className="mb-6">
            <CountryFilter 
              countries={countries}
              selectedCountry={selectedCountry}
              onCountryChange={setSelectedCountry}
            />
          </div>

          {/* News Grid */}
          {loadingNews ? (
            <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
              <div className="animate-spin h-8 w-8 border-2 border-green-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">Loading global news...</p>
            </div>
          ) : filteredNews.length > 0 ? (
            <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
              {filteredNews.map((article, idx) => (
                <GlobalNewsCard 
                  key={idx} 
                  article={article} 
                  country={article.country}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Global News Found</h3>
              <p className="text-gray-600 mb-4">
                {selectedCountry ? `No recent news available for ${selectedCountry}.` : 'No global news available at the moment.'}
              </p>
              {selectedCountry && (
                <button
                  onClick={() => setSelectedCountry('')}
                  className="text-green-600 hover:text-green-700 font-semibold text-sm transition-colors"
                >
                  View All Countries
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}