import { useEffect, useState } from "react";

const fetchJSON = async (url, options = {}) => {
  const r = await fetch(url, options);
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
};

// Safe number formatting utility
const safeToFixed = (value, decimals = 3, fallback = 'N/A') => {
  if (value === null || value === undefined || isNaN(value)) {
    return fallback;
  }
  return Number(value).toFixed(decimals);
};

function CorrelationCard({ correlation, onAnalyze }) {
  if (!correlation) return null;

  const { asset1, asset2, correlation: coeff, correlation_strength, insight } = correlation;
  
  const getCorrelationColor = (coeff) => {
    if (coeff === null || coeff === undefined || isNaN(coeff)) {
      return 'text-gray-600 bg-gray-100';
    }
    const abs = Math.abs(coeff);
    if (abs >= 0.7) return coeff > 0 ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100';
    if (abs >= 0.4) return coeff > 0 ? 'text-green-500 bg-green-50' : 'text-red-500 bg-red-50';
    return 'text-gray-600 bg-gray-100';
  };

  const getStrengthColor = (strength) => {
    if (strength === 'Very Strong' || strength === 'Strong') return 'text-purple-700 bg-purple-100';
    if (strength === 'Moderate') return 'text-blue-700 bg-blue-100';
    return 'text-gray-600 bg-gray-100';
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-900">{asset1?.symbol || 'N/A'}</span>
            <span className="text-gray-400">↔</span>
            <span className="font-bold text-gray-900">{asset2?.symbol || 'N/A'}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStrengthColor(correlation_strength)}`}>
            {correlation_strength}
          </span>
          <span className={`px-3 py-1 rounded-full text-lg font-bold ${getCorrelationColor(coeff)}`}>
            {safeToFixed(coeff, 3)}
          </span>
        </div>
      </div>

      {/* Asset Types */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500">{asset1?.name || asset1?.symbol || 'N/A'}</span>
          <span className={`px-2 py-1 rounded text-xs font-medium ${
            asset1?.type === 'stock' ? 'bg-blue-100 text-blue-700' : 
            asset1?.type === 'crypto' ? 'bg-orange-100 text-orange-700' : 
            'bg-green-100 text-green-700'
          }`}>
            {asset1?.type?.toUpperCase() || 'N/A'}
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500">{asset2?.name || asset2?.symbol || 'N/A'}</span>
          <span className={`px-2 py-1 rounded text-xs font-medium ${
            asset2?.type === 'stock' ? 'bg-blue-100 text-blue-700' : 
            asset2?.type === 'crypto' ? 'bg-orange-100 text-orange-700' : 
            'bg-green-100 text-green-700'
          }`}>
            {asset2?.type?.toUpperCase() || 'N/A'}
          </span>
        </div>
      </div>

      {/* Insight */}
      {insight && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Analysis</h4>
          <p className="text-sm text-gray-700 mb-2">{insight.summary}</p>
          <p className="text-xs text-gray-600">{insight.explanation}</p>
        </div>
      )}

      {/* Data Points */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs text-gray-500">
        <span>{correlation.data_points || 0} data points</span>
        <span>{correlation.timeframe || 30} days</span>
        <button 
          className="text-green-600 hover:text-green-700 font-medium transition-colors"
          onClick={() => onAnalyze && onAnalyze(correlation)}
        >
          View Chart →
        </button>
      </div>
    </div>
  );
}

function AssetSelector({ assets, selectedAssets, onAssetToggle, maxAssets = 4 }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Assets to Analyze</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {assets.map((asset, idx) => {
          const isSelected = selectedAssets.some(a => a.symbol === asset.symbol && a.type === asset.type);
          const isDisabled = !isSelected && selectedAssets.length >= maxAssets;
          
          return (
            <button
              key={idx}
              onClick={() => !isDisabled && onAssetToggle(asset)}
              disabled={isDisabled}
              className={`p-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                isSelected 
                  ? 'bg-green-100 text-green-700 border-2 border-green-300' 
                  : isDisabled
                  ? 'bg-gray-50 text-gray-400 border border-gray-200 cursor-not-allowed'
                  : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
              }`}
            >
              <div className="font-bold">{asset.symbol}</div>
              <div className="text-xs opacity-75">{asset.name}</div>
              <div className={`text-xs mt-1 px-2 py-1 rounded ${
                asset.type === 'stock' ? 'bg-blue-100 text-blue-600' : 
                asset.type === 'crypto' ? 'bg-orange-100 text-orange-600' : 
                'bg-green-100 text-green-600'
              }`}>
                {asset.type.toUpperCase()}
              </div>
            </button>
          );
        })}
      </div>
      
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
        <span className="text-sm text-gray-600">
          {selectedAssets.length}/{maxAssets} selected
        </span>
        <span className="text-xs text-gray-500">
          Select 2-{maxAssets} assets for correlation analysis
        </span>
      </div>
    </div>
  );
}

function PresetButtons({ onPresetSelect, loading }) {
  const presets = [
    { id: 'tech-crypto', label: 'Tech vs Crypto', description: 'AAPL, TSLA vs BTC, ETH' },
    { id: 'market-leaders', label: 'Market Leaders', description: 'AAPL, MSFT, GOOGL, NVDA' },
    { id: 'crypto-majors', label: 'Crypto Majors', description: 'BTC, ETH, ADA' }
  ];

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Analysis Presets</h3>
      <div className="grid gap-3">
        {presets.map((preset) => (
          <button
            key={preset.id}
            onClick={() => onPresetSelect(preset.id)}
            disabled={loading}
            className="p-4 rounded-lg bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 hover:from-purple-100 hover:to-indigo-100 transition-all duration-200 text-left disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="font-semibold text-gray-900">{preset.label}</div>
            <div className="text-sm text-gray-600">{preset.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Analytics() {
  const [correlations, setCorrelations] = useState([]);
  const [selectedAssets, setSelectedAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [presetData, setPresetData] = useState(null);
  const [activeTab, setActiveTab] = useState('custom');

  const availableAssets = [
    { symbol: 'AAPL', type: 'stock', name: 'Apple Inc.' },
    { symbol: 'MSFT', type: 'stock', name: 'Microsoft' },
    { symbol: 'GOOGL', type: 'stock', name: 'Google' },
    { symbol: 'TSLA', type: 'stock', name: 'Tesla' },
    { symbol: 'NVDA', type: 'stock', name: 'NVIDIA' },
    { symbol: 'BTC', type: 'crypto', name: 'Bitcoin' },
    { symbol: 'ETH', type: 'crypto', name: 'Ethereum' },
    { symbol: 'ADA', type: 'crypto', name: 'Cardano' }
  ];

  const handleAssetToggle = (asset) => {
    setSelectedAssets(prev => {
      const exists = prev.some(a => a.symbol === asset.symbol && a.type === asset.type);
      if (exists) {
        return prev.filter(a => !(a.symbol === asset.symbol && a.type === asset.type));
      } else {
        return [...prev, asset];
      }
    });
  };

  const analyzeCorrelations = async () => {
    if (selectedAssets.length < 2) return;
    
    setLoading(true);
    try {
      const response = await fetchJSON("http://localhost:5000/api/correlation/multiple", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          assets: selectedAssets,
          timeframe: 30
        })
      });
      
      setCorrelations(response.correlations || []);
    } catch (error) {
      console.error('Error analyzing correlations:', error);
      setCorrelations([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePresetSelect = async (presetId) => {
    setLoading(true);
    setActiveTab('presets');
    
    try {
      const response = await fetchJSON(`http://localhost:5000/api/correlation/presets/${presetId}?timeframe=30`);
      setPresetData(response);
    } catch (error) {
      console.error('Error fetching preset:', error);
      setPresetData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedAssets.length >= 2) {
      analyzeCorrelations();
    }
  }, [selectedAssets]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Cross-Market Analytics</h1>
              <p className="text-gray-600 mt-1">Discover how different markets move together</p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-indigo-600">
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-semibold">Correlation Engine</span>
              </div>
            </div>
          </div>
          
          {/* Navigation Tabs */}
          <div className="flex gap-1 mt-4 bg-gray-100 rounded-lg p-1 w-fit">
            {[
              { id: 'custom', label: 'Custom Analysis' },
              { id: 'presets', label: 'Quick Presets' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 max-w-7xl mx-auto">
        {/* Custom Analysis Tab */}
        {activeTab === 'custom' && (
          <div className="space-y-6">
            {/* Asset Selector */}
            <AssetSelector 
              assets={availableAssets}
              selectedAssets={selectedAssets}
              onAssetToggle={handleAssetToggle}
              maxAssets={4}
            />

            {/* Analysis Button */}
            {selectedAssets.length >= 2 && (
              <div className="text-center">
                <button
                  onClick={analyzeCorrelations}
                  disabled={loading}
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-lg shadow-md hover:from-green-600 hover:to-emerald-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Analyzing...' : `Analyze ${selectedAssets.length} Assets`}
                </button>
              </div>
            )}

            {/* Correlations Results */}
            {correlations.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Correlation Analysis Results</h2>
                <div className="grid gap-6 lg:grid-cols-2">
                  {correlations.map((correlation, idx) => (
                    <CorrelationCard key={idx} correlation={correlation} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Presets Tab */}
        {activeTab === 'presets' && (
          <div className="space-y-6">
            {/* Preset Buttons */}
            <PresetButtons onPresetSelect={handlePresetSelect} loading={loading} />

            {/* Preset Results */}
            {presetData && (
              <div>
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl p-6 mb-6 border border-purple-100">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-gray-900">
                      {presetData.preset.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())} Analysis
                    </h2>
                    <div className="flex items-center gap-2">
                      <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-semibold">
                        {presetData.summary?.total_pairs} Correlations
                      </span>
                      <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm font-semibold">
                        Avg: {safeToFixed(presetData.summary?.average_correlation, 3)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {presetData.assets?.map((asset, idx) => (
                      <div key={idx} className="bg-white rounded-lg p-3 text-center shadow-sm">
                        <div className="font-bold text-gray-900">{asset.symbol}</div>
                        <div className="text-xs text-gray-600">{asset.name}</div>
                        <div className={`text-xs mt-1 px-2 py-1 rounded ${
                          asset.type === 'stock' ? 'bg-blue-100 text-blue-600' : 
                          asset.type === 'crypto' ? 'bg-orange-100 text-orange-600' : 
                          'bg-green-100 text-green-600'
                        }`}>
                          {asset.type.toUpperCase()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  {presetData.correlations?.map((correlation, idx) => (
                    <CorrelationCard key={idx} correlation={correlation} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500"></div>
              <span className="text-gray-600">Analyzing correlations...</span>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && correlations.length === 0 && !presetData && (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Start Your Analysis</h3>
            <p className="text-gray-600 mb-4">
              Select assets to analyze correlations or choose a quick preset to get started.
            </p>
            <p className="text-xs text-gray-500">
              The correlation engine will calculate how assets move together over the last 30 days.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}