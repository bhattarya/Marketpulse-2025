import { useEffect, useState } from 'react';
import Header from '../layout/Header';
import StatCard from '../components/StatCard';
import { fetchCryptoData, fetchStockData } from '../api/marketData';

export default function Dashboard() {
  const [assets, setAssets] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function fetchData() {
      const crypto = await fetchCryptoData();
      const stocks = await fetchStockData();
      setAssets([...crypto, ...stocks]);
    }

    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />

      <main className="p-6 space-y-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Market Cap" value="$1.7T" />
          <StatCard label="24h Volume" value="$89.5B" />
          <StatCard label="Fear & Greed Index" value="57.63" subtext="Greed" />
          <StatCard label="Market Sentiment" value="65% Bullish" />
        </div>

        {/* Asset Table with Search */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-2">Market Sentiment Tracker</h2>

          {/* Search Bar */}
          <input
            type="text"
            placeholder="Search by name or symbol..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full mb-4 px-4 py-2 rounded bg-zinc-800 text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-green-400"
          />

          {/* Filtered Results */}
          <div className="bg-zinc-900 p-4 rounded-lg space-y-2">
            {assets.length === 0 ? (
              <p className="text-gray-400">Loading assets...</p>
            ) : (
              assets
                .filter(asset =>
                  asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  asset.symbol.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map((asset, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between text-sm border-b border-zinc-800 pb-1 last:border-none"
                  >
                    <span>{asset.name} ({asset.symbol})</span>
                    <span
                      className={
                        parseFloat(asset.change) >= 0
                          ? 'text-green-400'
                          : 'text-red-400'
                      }
                    >
                      ${asset.price} ({asset.change}%)
                    </span>
                  </div>
                ))
            )}
          </div>
        </div>

        {/* Tailwind Check */}
        <div className="bg-green-600 text-white p-4 rounded-lg">
          ✅ Tailwind is working!
        </div>

        {/* News Feed Placeholder */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-2">AI-Powered Market Intelligence</h2>
          <div className="bg-zinc-900 p-4 rounded-lg text-gray-400">
            [News feed coming soon]
          </div>
        </div>
      </main>
    </div>
  );
}
