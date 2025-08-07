import { useEffect, useState } from 'react';
import { fetchCryptoData, fetchStockData } from '../api/api';

export default function AssetTable() {
  const [assets, setAssets] = useState([]);

  useEffect(() => {
    async function loadData() {
      const crypto = await fetchCryptoData();
      const stocks = await fetchStockData();
      setAssets([...crypto, ...stocks]);
    }
    loadData();
  }, []);

  return (
    <div className="bg-zinc-900 rounded-lg overflow-x-auto">
      <table className="min-w-full text-sm text-white">
        <thead className="bg-zinc-800 text-left">
          <tr>
            <th className="p-3">Name</th>
            <th className="p-3">Symbol</th>
            <th className="p-3">Price (USD)</th>
            <th className="p-3">24h Change</th>
            <th className="p-3">Type</th>
          </tr>
        </thead>
        <tbody>
          {assets.map(asset => (
            <tr key={asset.symbol} className="border-t border-zinc-700">
              <td className="p-3">{asset.name}</td>
              <td className="p-3">{asset.symbol}</td>
              <td className="p-3">${asset.price.toLocaleString()}</td>
              <td className={`p-3 ${asset.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {asset.change}%
              </td>
              <td className="p-3 capitalize">{asset.type}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
