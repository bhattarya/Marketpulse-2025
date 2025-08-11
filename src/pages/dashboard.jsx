import { useEffect, useState, useMemo } from "react";
import IntelligenceWidget from "../components/IntelligenceWidget";
import Intelligence from "./Intelligence";

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
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-gray-600 text-sm font-medium">{title}</h3>
        {trend && (
          <div className={`px-2 py-1 rounded-full text-xs font-semibold ${
            trend === 'up' ? 'bg-green-50 text-green-700' : 
            trend === 'down' ? 'bg-red-50 text-red-700' : 
            'bg-gray-50 text-gray-700'
          }`}>
            {trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→'}
          </div>
        )}
      </div>
      <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>
      <p className="text-gray-500 text-sm">{sub}</p>
    </div>
  );
}

function AssetCard({ name, symbol, price, changePct, volume, isLarge = false }) {
  const isUp = typeof changePct === "number" ? changePct >= 0 : null;
  const changeColor = isUp === null ? "text-gray-600" : isUp ? "text-green-600" : "text-red-600";
  
  return (
    <div className={`bg-white rounded-2xl p-${isLarge ? '6' : '4'} shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 cursor-pointer`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className={`font-semibold text-gray-900 ${isLarge ? 'text-lg' : 'text-base'}`}>{name}</h3>
          <p className="text-gray-500 text-sm">{symbol}</p>
        </div>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
          isUp === null ? 'bg-gray-100 text-gray-600' : 
          isUp ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
        }`}>
          {symbol?.charAt(0) || '?'}
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <div>
          <p className={`font-bold ${isLarge ? 'text-2xl' : 'text-xl'} text-gray-900`}>
            ${price != null ? Number(price).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : "--"}
          </p>
          <p className={`text-sm ${changeColor} font-semibold`}>
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

/* ---------- main page ---------- */
export default function Dashboard() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [crypto, setCrypto] = useState([]);
  const [stocks, setStocks] = useState({});
  const [fearGreed, setFearGreed] = useState(null);
  const [news, setNews] = useState([]);

  const [loadingCrypto, setLoadingCrypto] = useState(true);
  const [loadingNews, setLoadingNews] = useState(true);

  // display these tickers in the table
  const stockSymbols = useMemo(() => ["AAPL", "TSLA", "NVDA"], []);
  // news driver (you can wire this to an input later)
  const newsTicker = "TSLA";

  useEffect(() => {
    const run = async () => {
      // ---- Crypto
      try {
        setLoadingCrypto(true);
        const cryptoData = await fetchJSON("http://localhost:5000/api/crypto");
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
              `http://localhost:5000/api/stocks?symbol=${sym}`
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

      // ---- Fear & Greed (best-effort)
      try {
        const fg = await fetchJSON("https://api.alternative.me/fng/");
        setFearGreed(fg?.data?.[0] ?? null);
      } catch {
        setFearGreed(null);
      }

      // ---- News (Gemini summaries from your backend)
      try {
        setLoadingNews(true);
        const items = await fetchJSON(
          `http://localhost:5000/api/news?ticker=${newsTicker}`
        );
        const mapped = (Array.isArray(items) ? items : []).map(normalizeNews);
        setNews(mapped);
      } catch (e) {
        console.error("News fetch error:", e);
        setNews([]);
      } finally {
        setLoadingNews(false);
      }
    };

    run();
  }, [stockSymbols]); // load once on mount and when stockSymbols change

  if (currentView === 'intelligence') {
    return <Intelligence />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">M</span>
            </div>
            <span className="text-xl font-bold text-gray-900">MarketPulse</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            {[
              { id: 'dashboard', label: 'Dashboard' },
              { id: 'intelligence', label: 'Intelligence' },
              { id: 'analytics', label: 'Analytics' },
              { id: 'portfolio', label: 'Portfolio' },
              { id: 'settings', label: 'Settings' }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`font-medium text-sm transition-colors ${
                  currentView === item.id
                    ? 'text-green-600'
                    : 'text-gray-600 hover:text-gray-900'
                } ${item.id !== 'dashboard' && item.id !== 'intelligence' ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                disabled={item.id !== 'dashboard' && item.id !== 'intelligence'}
              >
                {item.label}
                {item.id === 'intelligence' && (
                  <span className="ml-1 bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full text-xs font-semibold">
                    AI
                  </span>
                )}
              </button>
            ))}
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-semibold">Live</span>
            </div>
          </div>
        </div>
      </nav>

      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Good morning</h1>
          <p className="text-gray-600">Here's what's happening in your markets today</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Total Market Cap"
            value="$1.77T"
            sub="Global market capitalization"
            trend="up"
          />
          <MetricCard
            title="24h Volume"
            value="$89.5B"
            sub="Total trading volume"
            trend="up"
          />
          <MetricCard
            title="Fear & Greed Index"
            value={fearGreed ? fearGreed.value : "—"}
            sub={fearGreed ? fearGreed.value_classification : "Unavailable"}
          />
          <MetricCard
            title="Active Positions"
            value="12"
            sub="Portfolio holdings"
          />
        </div>

        {/* Intelligence Widget */}
        <div className="mb-8">
          <IntelligenceWidget onViewAll={setCurrentView} />
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
                    publishedAt={n.publishedAt}
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
