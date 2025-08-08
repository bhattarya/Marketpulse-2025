import { useEffect, useState } from "react";

export default function Dashboard() {
  const [crypto, setCrypto] = useState([]);
  const [stocks, setStocks] = useState({});
  const [fearGreed, setFearGreed] = useState(null);
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      // Fetch crypto
      const cryptoRes = await fetch("http://localhost:5000/api/crypto");
      const cryptoData = await cryptoRes.json();
      setCrypto(cryptoData);

      // Fetch stocks
      const stockSymbols = ["AAPL", "TSLA", "NVDA"];
      const stockResults = {};
      for (let symbol of stockSymbols) {
        const res = await fetch(`http://localhost:5000/api/stocks?symbol=${symbol}`);
        const data = await res.json();
        stockResults[symbol] = data;
      }
      setStocks(stockResults);

      // Fear & Greed Index
      const fgRes = await fetch("https://api.alternative.me/fng/");
      const fgData = await fgRes.json();
      setFearGreed(fgData.data[0]);

      // Placeholder News (replace with NewsAPI or Finnhub news later)
      setNews([
        {
          id: 1,
          title: "Federal Reserve Hints at Rate Cuts in Q2 2024",
          sentiment: "Positive",
          tickers: ["BTC", "ETH", "AAPL"]
        },
        {
          id: 2,
          title: "NVIDIA Reports Record Q4 Earnings Driven by AI Demand",
          sentiment: "Positive",
          tickers: ["NVDA"]
        }
      ]);

      setLoading(false);
    };

    fetchData();
  }, []);

  return (
    <div className="bg-gray-900 text-white min-h-screen">
      {/* Navbar */}
      <nav className="bg-gray-800 px-6 py-4 flex justify-between items-center border-b border-gray-700">
        <div className="flex items-center gap-2 text-xl font-bold">
          <span className="text-green-400">●</span> MarketPulse
        </div>
        <ul className="flex gap-6">
          {["Dashboard", "Sentiment", "Tariffs", "Analytics", "News & Tweets"].map((item) => (
            <li key={item} className="hover:text-green-400 cursor-pointer">
              {item}
            </li>
          ))}
        </ul>
        <span className="text-green-400 text-sm">● LIVE</span>
      </nav>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-6">
        <Card title="Total Market Cap" value="$1.77T" sub="Global market capitalization" />
        <Card title="24h Volume" value="$89.5B" sub="Total trading volume" />
        <Card title="Fear & Greed Index" value={fearGreed ? fearGreed.value : "65"} sub={fearGreed ? fearGreed.value_classification : "Greed"} />
        <Card title="Market Sentiment" value="65% Bullish" sub="Bearish: 20% | Neutral: 15%" />
      </div>

      <div className="grid md:grid-cols-3 gap-6 p-6">
        {/* Market Sentiment Tracker */}
        <div className="md:col-span-2 bg-gray-800 p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold mb-4">Market Sentiment Tracker <span className="text-green-400 text-sm">● LIVE</span></h2>
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
              {crypto.map((c) => (
                <AssetRow key={c.id} name={c.name} symbol={c.symbol.toUpperCase()} price={c.current_price} change={c.price_change_percentage_24h} volume={c.total_volume} />
              ))}
              {Object.values(stocks).map((s) => (
                <AssetRow key={s.symbol} name={s.symbol} symbol={s.symbol} price={s.price} change={s.changePercent} volume="--" />
              ))}
            </tbody>
          </table>
        </div>

        {/* AI-Powered Market Intelligence */}
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold mb-4">AI-Powered Market Intelligence</h2>
          <div className="flex gap-4 mb-4">
            <button className="bg-green-600 px-3 py-1 rounded">News</button>
            <button className="bg-gray-700 px-3 py-1 rounded">Social Sentiment</button>
          </div>
          {news.map((n) => (
            <div key={n.id} className="border-b border-gray-700 pb-4 mb-4">
              <span className={`text-xs px-2 py-1 rounded ${n.sentiment === "Positive" ? "bg-green-600" : "bg-red-600"}`}>
                {n.sentiment}
              </span>
              <p className="mt-2">{n.title}</p>
              <div className="mt-1 flex gap-2 text-xs text-gray-400">
                {n.tickers.map((t) => (
                  <span key={t} className="bg-gray-700 px-2 py-1 rounded">{t}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Card({ title, value, sub }) {
  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
      <h3 className="text-gray-400 text-sm">{title}</h3>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-gray-500 text-xs">{sub}</p>
    </div>
  );
}

function AssetRow({ name, symbol, price, change, volume }) {
  return (
    <tr className="border-b border-gray-700">
      <td className="py-2">{name} <span className="text-gray-400 text-xs">({symbol})</span></td>
      <td>${price ? price.toLocaleString() : "--"}</td>
      <td className={change >= 0 ? "text-green-400" : "text-red-400"}>
        {change ? `${change.toFixed(2)}%` : "--"}
      </td>
      <td>{volume !== "--" ? volume.toLocaleString() : "--"}</td>
    </tr>
  );
}
