import { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import IntelligenceWidget from "../components/IntelligenceWidget";

/* ---------- helpers ---------- */
const fetchJSON = async (url) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
};

// normalize a stock object from either your normalized backend OR raw Finnhub
const normalizeStock = (s, symbolFallback = "") => ({
  symbol: s.symbol || symbolFallback,
  price: s.price ?? s.c ?? null,
  change: s.change ?? s.d ?? null,
  changePercent: s.changePercent ?? s.dp ?? null,
  high: s.high ?? s.h ?? null,
  low: s.low ?? s.l ?? null,
  open: s.open ?? s.o ?? null,
  prevClose: s.prevClose ?? s.pc ?? null,
});

// normalize news item from NewsAPI/Finnhub → Gemini output (or raw fallback)
const normalizeNews = (n) => ({
  title: n.title ?? "Untitled",
  url: n.url ?? "#",
  image: n.image ?? n.urlToImage ?? "",
  source: typeof n.source === "string" ? n.source : (n.source?.name ?? "Unknown"),
  summary: n.summary ?? n.description ?? "No summary available",
  sentiment: n.sentiment ?? "Neutral",
  publishedAt: n.publishedAt ?? null,
});

/* ---------- Robinhood-style UI components ---------- */
function MetricCard({ title, value, sub, trend }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 card-hover fade-in-stagger">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-gray-600 text-sm font-medium">{title}</h3>
        {trend && (
          <div className={`px-2 py-1 rounded-full text-xs font-semibold transition-fast ${
            trend === 'up' ? 'bg-green-50 text-green-700' : 
            trend === 'down' ? 'bg-red-50 text-red-700' : 
            'bg-gray-50 text-gray-700'
          }`}>
            {trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→'}
          </div>
        )}
      </div>
      <p className="text-3xl font-bold text-gray-900 mb-1 counter-up">{value}</p>
      <p className="text-gray-500 text-sm">{sub}</p>
    </div>
  );
}

function AssetCard({ name, symbol, price, changePct, volume, isLarge = false }) {
  const isUp = typeof changePct === "number" ? changePct >= 0 : null;
  const changeColor = isUp === null ? "text-gray-600" : isUp ? "text-green-600" : "text-red-600";
  
  return (
    <div className={`bg-white rounded-2xl p-${isLarge ? '6' : '4'} shadow-sm border border-gray-100 card-hover cursor-pointer fade-in-stagger btn-hover`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className={`font-semibold text-gray-900 ${isLarge ? 'text-lg' : 'text-base'}`}>{name}</h3>
          <p className="text-gray-500 text-sm">{symbol}</p>
        </div>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-fast ${
          isUp === null ? 'bg-gray-100 text-gray-600' : 
          isUp ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
        }`}>
          {symbol?.charAt(0) || '?'}
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <div>
          <p className={`font-bold ${isLarge ? 'text-2xl' : 'text-xl'} text-gray-900 counter-up`}>
            ${price != null ? Number(price).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : "--"}
          </p>
          <p className={`text-sm ${changeColor} font-semibold transition-fast`}>
            {changePct != null ? `${isUp ? '+' : ''}${Number(changePct).toFixed(2)}%` : "--"}
          </p>
        </div>
        {volume !== "--" && (
          <div className="text-right">
            <p className="text-xs text-gray-500">Volume</p>
            <p className="text-sm font-medium text-gray-700">
              {Number(volume || 0).toLocaleString()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function NewsCard({ title, url, source, summary, sentiment, impact, key_metrics, publishedAt, ai_enhanced }) {
  const sentimentColor = 
    sentiment?.toLowerCase() === 'positive' ? 'text-green-600 bg-green-50' :
    sentiment?.toLowerCase() === 'negative' ? 'text-red-600 bg-red-50' :
    'text-gray-600 bg-gray-50';
    
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${sentimentColor}`}>
            {sentiment || 'Neutral'}
          </span>
          {ai_enhanced && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-medium text-purple-700">AI</span>
            </div>
          )}
        </div>
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
        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{title}</h3>
        <p className="text-gray-600 text-sm line-clamp-3 mb-3">{summary}</p>
        
        {ai_enhanced && impact && (
          <div className="bg-purple-50 rounded-lg p-3 mb-3">
            <h4 className="text-xs font-semibold text-purple-800 mb-1">Market Impact</h4>
            <p className="text-xs text-purple-700 line-clamp-2">{impact}</p>
          </div>
        )}
        
        {ai_enhanced && key_metrics && key_metrics !== "None" && key_metrics !== "No specific metrics mentioned" && (
          <div className="bg-blue-50 rounded-lg p-2">
            <h4 className="text-xs font-semibold text-blue-800 mb-1">Key Metrics</h4>
            <p className="text-xs text-blue-700">{key_metrics}</p>
          </div>
        )}
      </a>
    </div>
  );
}

/* ---------- main page ---------- */
export default function Dashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [crypto, setCrypto] = useState([]);
  const [stocks, setStocks] = useState({});
  const [marketMetrics, setMarketMetrics] = useState(null);
  const [news, setNews] = useState([]);

  const [loadingCrypto, setLoadingCrypto] = useState(true);
  const [loadingNews, setLoadingNews] = useState(true);
  const [loadingMetrics, setLoadingMetrics] = useState(true);

  // Get symbol from URL params or use defaults
  const urlSymbol = searchParams.get('symbol');
  const stockSymbols = useMemo(() => {
    const defaults = ["AAPL", "TSLA", "NVDA"];
    return urlSymbol ? [urlSymbol, ...defaults.filter(s => s !== urlSymbol)].slice(0, 3) : defaults;
  }, [urlSymbol]);
  
  // Show general market news instead of ticker-specific
  const showGeneralNews = true;

  useEffect(() => {
    const run = async () => {
      // ---- Crypto
      try {
        setLoadingCrypto(true);
        const cryptoData = await fetchJSON("https://marketpulse-2025-2.onrender.com/api/crypto");
        setCrypto(Array.isArray(cryptoData) ? cryptoData : []);
      } catch (e) {
        console.error("Crypto fetch error:", e);
        setCrypto([]);
      } finally {
        setLoadingCrypto(false);
      }

      // ---- Stocks
      try {
        const results = {};
        for (const sym of stockSymbols) {
          try {
            const raw = await fetchJSON(
              `https://marketpulse-2025-2.onrender.com/api/stocks?symbol=${sym}`
            );
            results[sym] = normalizeStock(raw, sym);
          } catch (e) {
            console.warn(`Stock fetch failed for ${sym}:`, e.message);
            results[sym] = normalizeStock({}, sym); // keep row placeholder
          }
        }
        setStocks(results);
      } catch (e) {
        console.error("Stocks block error:", e);
        setStocks({});
      }

      // ---- Market Metrics (Fear & Greed, Market Cap, Volume)
      try {
        setLoadingMetrics(true);
        const metrics = await fetchJSON("https://marketpulse-2025-2.onrender.com/api/market-metrics");
        setMarketMetrics(metrics);
      } catch (e) {
        console.error("Market metrics fetch error:", e);
        setMarketMetrics(null);
      } finally {
        setLoadingMetrics(false);
      }

      // ---- Dashboard News (General market news with AI analysis)
      try {
        setLoadingNews(true);
        const items = await fetchJSON(
          `https://marketpulse-2025-2.onrender.com/api/news/dashboard`
        );
        const mapped = (Array.isArray(items) ? items : []).map(normalizeNews);
        setNews(mapped);
      } catch (e) {
        console.error("Dashboard news fetch error:", e);
        setNews([]);
      } finally {
        setLoadingNews(false);
      }
    };

    run();
  }, [stockSymbols]); // load once on mount and when stockSymbols change

  const handleViewAll = (section) => {
    console.log('handleViewAll called with section:', section);
    if (section === 'intelligence') {
      console.log('Navigating to /intelligence');
      navigate('/intelligence');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">

      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Good morning</h1>
          <p className="text-gray-600">Here's what's happening in your markets today</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <MetricCard
            title="Total Market Cap"
            value={marketMetrics?.totalMarketCap ? `$${(marketMetrics.totalMarketCap / 1e12).toFixed(2)}T` : "—"}
            sub="Global market capitalization"
            trend={marketMetrics?.marketCapChange24h > 0 ? "up" : marketMetrics?.marketCapChange24h < 0 ? "down" : null}
          />
          <MetricCard
            title="24h Volume"
            value={marketMetrics?.total24hVolume ? `$${(marketMetrics.total24hVolume / 1e9).toFixed(1)}B` : "—"}
            sub="Total trading volume"
            trend="up"
          />
          <MetricCard
            title="Fear & Greed Index"
            value={marketMetrics?.fearGreed ? marketMetrics.fearGreed.value : "—"}
            sub={marketMetrics?.fearGreed ? marketMetrics.fearGreed.value_classification : "Loading..."}
            trend={marketMetrics?.fearGreed?.value > 50 ? "up" : marketMetrics?.fearGreed?.value < 50 ? "down" : null}
          />
        </div>

        {/* Intelligence Widget */}
        <div className="mb-8">
          <IntelligenceWidget onViewAll={handleViewAll} />
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Portfolio Overview */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Your Investments</h2>
              <button className="text-green-600 font-semibold text-sm hover:text-green-700 transition-colors">
                View All
              </button>
            </div>
            
            <div className="grid gap-4">
              {/* Top performing assets */}
              {loadingCrypto ? (
                <div className="bg-white rounded-2xl p-6 text-center">
                  <p className="text-gray-500">Loading investments...</p>
                </div>
              ) : crypto.length ? (
                crypto.slice(0, 3).map((c) => (
                  <AssetCard
                    key={c.id}
                    name={c.name}
                    symbol={(c.symbol || "").toUpperCase()}
                    price={c.current_price}
                    changePct={c.price_change_percentage_24h}
                    volume={c.total_volume}
                    isLarge={true}
                  />
                ))
              ) : null}
              
              {/* Stock positions */}
              {Object.keys(stocks).length ? (
                <div className="grid md:grid-cols-2 gap-4">
                  {Object.values(stocks).map((s) => (
                    <AssetCard
                      key={s.symbol}
                      name={s.symbol}
                      symbol={s.symbol}
                      price={s.price}
                      changePct={s.changePercent}
                      volume="--"
                    />
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          {/* News & Insights */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Market News</h2>
              <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs font-semibold">
                AI Powered
              </span>
            </div>
            
            <div className="space-y-4">
              {loadingNews ? (
                <div className="bg-white rounded-2xl p-6 text-center">
                  <p className="text-gray-500">Loading news...</p>
                </div>
              ) : news.length ? (
                news.slice(0, 4).map((n, idx) => (
                  <NewsCard
                    key={idx}
                    title={n.title}
                    url={n.url}
                    source={n.source}
                    summary={n.summary}
                    sentiment={n.sentiment}
                    impact={n.impact}
                    key_metrics={n.key_metrics}
                    publishedAt={n.publishedAt}
                    ai_enhanced={n.ai_enhanced}
                  />
                ))
              ) : (
                <div className="bg-white rounded-2xl p-6 text-center">
                  <p className="text-gray-500">No news available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
