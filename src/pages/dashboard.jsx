import { useEffect, useState } from "react";

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

/* ---------- small UI bits ---------- */
function Card({ title, value, sub }) {
  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
      <h3 className="text-gray-400 text-sm">{title}</h3>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-gray-500 text-xs">{sub}</p>
    </div>
  );
}

function AssetRow({ name, symbol, price, changePct, volume }) {
  const isUp = typeof changePct === "number" ? changePct >= 0 : null;
  return (
    <tr className="border-b border-gray-700">
      <td className="py-2">
        {name} <span className="text-gray-400 text-xs">({symbol})</span>
      </td>
      <td>${price != null ? Number(price).toLocaleString() : "--"}</td>
      <td className={isUp == null ? "" : isUp ? "text-green-400" : "text-red-400"}>
        {changePct != null ? `${Number(changePct).toFixed(2)}%` : "--"}
      </td>
      <td>{volume !== "--" ? Number(volume || 0).toLocaleString() : "--"}</td>
    </tr>
  );
}

function SentimentBadge({ value }) {
  const v = (value || "Neutral").toLowerCase();
  const cls =
    v === "positive"
      ? "bg-green-600"
      : v === "negative"
      ? "bg-red-600"
      : "bg-gray-600";
  return (
    <span className={`text-xs px-2 py-1 rounded ${cls}`}>
      {value || "Neutral"}
    </span>
  );
}

/* ---------- main page ---------- */
export default function Dashboard() {
  const [crypto, setCrypto] = useState([]);
  const [stocks, setStocks] = useState({});
  const [fearGreed, setFearGreed] = useState(null);
  const [news, setNews] = useState([]);

  const [loadingCrypto, setLoadingCrypto] = useState(true);
  const [loadingStocks, setLoadingStocks] = useState(true);
  const [loadingNews, setLoadingNews] = useState(true);

  // display these tickers in the table
  const stockSymbols = ["AAPL", "TSLA", "NVDA"];
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
        setLoadingStocks(true);
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
      } finally {
        setLoadingStocks(false);
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
  }, []); // load once on mount

  return (
    <div className="bg-gray-900 text-white min-h-screen">
      {/* Navbar */}
      <nav className="bg-gray-800 px-6 py-4 flex justify-between items-center border-b border-gray-700">
        <div className="flex items-center gap-2 text-xl font-bold">
          <span className="text-green-400">●</span> MarketPulse
        </div>
        <ul className="flex gap-6">
          {["Dashboard", "Sentiment", "Tariffs", "Analytics", "News & Tweets"].map(
            (item) => (
              <li key={item} className="hover:text-green-400 cursor-pointer">
                {item}
              </li>
            )
          )}
        </ul>
        <span className="text-green-400 text-sm">● LIVE</span>
      </nav>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-6">
        <Card
          title="Total Market Cap"
          value="$1.77T"
          sub="Global market capitalization"
        />
        <Card title="24h Volume" value="$89.5B" sub="Total trading volume" />
        <Card
          title="Fear & Greed Index"
          value={fearGreed ? fearGreed.value : "—"}
          sub={fearGreed ? fearGreed.value_classification : "Unavailable"}
        />
        <Card
          title="Market Sentiment"
          value="—"
          sub="Aggregated (coming soon)"
        />
      </div>

      <div className="grid md:grid-cols-3 gap-6 p-6">
        {/* Market Sentiment Tracker (Crypto + Stocks) */}
        <div className="md:col-span-2 bg-gray-800 p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold mb-4">
            Market Sentiment Tracker{" "}
            <span className="text-green-400 text-sm">● LIVE</span>
          </h2>

          <table className="w-full text-left">
            <thead className="border-b border-gray-700">
              <tr>
                <th className="pb-2">Asset</th>
                <th className="pb-2">Price</th>
                <th className="pb-2">24h Change</th>
                <th className="pb-2">Volume</th>
              </tr>
            </thead>
            <tbody>
              {/* Crypto rows */}
              {loadingCrypto ? (
                <tr>
                  <td className="py-3 text-gray-400" colSpan={4}>
                    Loading crypto…
                  </td>
                </tr>
              ) : crypto.length ? (
                crypto.map((c) => (
                  <AssetRow
                    key={`c-${c.id}`}
                    name={c.name}
                    symbol={(c.symbol || "").toUpperCase()}
                    price={c.current_price}
                    changePct={c.price_change_percentage_24h}
                    volume={c.total_volume}
                  />
                ))
              ) : (
                <tr>
                  <td className="py-3 text-gray-400" colSpan={4}>
                    No crypto data.
                  </td>
                </tr>
              )}

              {/* Stock rows */}
              {loadingStocks ? (
                <tr>
                  <td className="py-3 text-gray-400" colSpan={4}>
                    Loading stocks…
                  </td>
                </tr>
              ) : Object.keys(stocks).length ? (
                Object.values(stocks).map((s) => (
                  <AssetRow
                    key={`s-${s.symbol}`}
                    name={s.symbol}
                    symbol={s.symbol}
                    price={s.price}
                    changePct={s.changePercent}
                    volume="--"
                  />
                ))
              ) : (
                <tr>
                  <td className="py-3 text-gray-400" colSpan={4}>
                    No stock data.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* AI-Powered Market Intelligence (News) */}
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold mb-4">
            AI-Powered Market Intelligence
            <span className="ml-2 text-[10px] bg-purple-600 px-2 py-0.5 rounded">
              AI
            </span>
          </h2>

          {loadingNews ? (
            <p className="text-gray-400">Loading news…</p>
          ) : news.length ? (
            news.map((n, idx) => (
              <div key={idx} className="border-b border-gray-700 pb-4 mb-4">
                <div className="flex items-center justify-between">
                  <SentimentBadge value={n.sentiment} />
                  <span className="text-xs text-gray-400">
                    {n.source} •{" "}
                    {n.publishedAt
                      ? new Date(n.publishedAt).toLocaleString()
                      : "—"}
                  </span>
                </div>
                <a
                  href={n.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 block font-semibold hover:underline"
                >
                  {n.title}
                </a>
                <p className="mt-1 text-sm text-gray-300">{n.summary}</p>
              </div>
            ))
          ) : (
            <p className="text-gray-400">No news available.</p>
          )}
        </div>
      </div>
    </div>
  );
}
