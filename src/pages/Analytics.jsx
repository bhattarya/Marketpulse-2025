import { useEffect, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

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

function HeaderFilters({ filters, onFilterChange, loading }) {
  const assetTypes = ['stocks', 'crypto', 'indices'];
  const dateRanges = [
    { value: '7D', label: '7 Days' },
    { value: '1M', label: '1 Month' },
    { value: '3M', label: '3 Months' },
    { value: '1Y', label: '1 Year' }
  ];

  const availableAssets = {
    stocks: [
      { symbol: 'AAPL', name: 'Apple Inc.' },
      { symbol: 'MSFT', name: 'Microsoft' },
      { symbol: 'GOOGL', name: 'Google' },
      { symbol: 'TSLA', name: 'Tesla' },
      { symbol: 'NVDA', name: 'NVIDIA' },
      { symbol: 'AMZN', name: 'Amazon' }
    ],
    crypto: [
      { symbol: 'BTC', name: 'Bitcoin' },
      { symbol: 'ETH', name: 'Ethereum' },
      { symbol: 'ADA', name: 'Cardano' },
      { symbol: 'SOL', name: 'Solana' }
    ],
    indices: [
      { symbol: 'SPY', name: 'S&P 500' },
      { symbol: 'QQQ', name: 'NASDAQ 100' },
      { symbol: 'DIA', name: 'Dow Jones' }
    ]
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 card-hover">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Asset Type */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Asset Type</label>
          <select
            value={filters.assetType}
            onChange={(e) => onFilterChange('assetType', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-fast"
            disabled={loading}
          >
            {assetTypes.map(type => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Primary Asset */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Primary Asset</label>
          <select
            value={filters.primaryAsset}
            onChange={(e) => onFilterChange('primaryAsset', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-fast"
            disabled={loading}
          >
            {availableAssets[filters.assetType]?.map(asset => (
              <option key={asset.symbol} value={asset.symbol}>
                {asset.symbol} - {asset.name}
              </option>
            ))}
          </select>
        </div>

        {/* Compare Mode Toggle */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Compare Mode</label>
          <div className="flex items-center">
            <button
              onClick={() => onFilterChange('compareMode', !filters.compareMode)}
              className={`w-full px-4 py-2 rounded-lg font-medium transition-fast btn-hover ${
                filters.compareMode
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              disabled={loading}
            >
              {filters.compareMode ? 'Compare ON' : 'Compare OFF'}
            </button>
          </div>
        </div>

        {/* Secondary Asset (if compare mode) */}
        {filters.compareMode && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Compare With</label>
            <select
              value={filters.secondaryAsset}
              onChange={(e) => onFilterChange('secondaryAsset', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-fast"
              disabled={loading}
            >
              {availableAssets[filters.assetType]?.map(asset => (
                <option key={asset.symbol} value={asset.symbol}>
                  {asset.symbol} - {asset.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Date Range */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Time Range</label>
          <select
            value={filters.dateRange}
            onChange={(e) => onFilterChange('dateRange', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-fast"
            disabled={loading}
          >
            {dateRanges.map(range => (
              <option key={range.value} value={range.value}>
                {range.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Analyze Button */}
      <div className="mt-4 flex justify-center">
        <button
          onClick={() => onFilterChange('analyze', true)}
          disabled={loading}
          className="px-8 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-lg shadow-md hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed btn-hover"
        >
          {loading ? 'Analyzing...' : 'Run Analysis'}
        </button>
      </div>
    </div>
  );
}

function PerformanceChart({ data, compareMode, title }) {
  if (!data) return null;

  const chartData = {
    labels: data.labels || [],
    datasets: data.datasets || []
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: title
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        title: {
          display: true,
          text: 'Price ($)'
        }
      }
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 card-hover">
      <div className="h-96">
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}

function CorrelationHeatmap({ correlationData }) {
  if (!correlationData) return null;

  const getCorrelationColor = (value) => {
    if (value >= 0.7) return 'bg-green-500';
    if (value >= 0.3) return 'bg-green-300';
    if (value >= -0.3) return 'bg-yellow-300';
    if (value >= -0.7) return 'bg-red-300';
    return 'bg-red-500';
  };

  const getTextColor = (value) => {
    return Math.abs(value) > 0.5 ? 'text-white' : 'text-gray-900';
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 card-hover">
      <h3 className="text-xl font-bold text-gray-900 mb-6">Correlation Matrix</h3>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="p-2"></th>
              {correlationData.assets?.map(asset => (
                <th key={asset} className="p-2 text-sm font-semibold text-gray-700">
                  {asset}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {correlationData.matrix?.map((row, i) => (
              <tr key={i}>
                <td className="p-2 text-sm font-semibold text-gray-700">
                  {correlationData.assets[i]}
                </td>
                {row.map((value, j) => (
                  <td key={j} className="p-1">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-xs font-bold transition-fast ${getCorrelationColor(value)} ${getTextColor(value)}`}>
                      {safeToFixed(value, 2)}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex justify-center">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span>Strong Positive (+0.7 to +1.0)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span>Strong Negative (-1.0 to -0.7)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-300 rounded"></div>
            <span>Weak (-0.3 to +0.3)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function RiskMetrics({ riskData }) {
  if (!riskData) return null;

  const getRiskColor = (level) => {
    switch(level) {
      case 'Low': return 'text-green-600 bg-green-50 border-green-200';
      case 'Medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'High': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 card-hover">
      <h3 className="text-xl font-bold text-gray-900 mb-6">Risk & Volatility Metrics</h3>
      
      <div className="space-y-4">
        {riskData.assets?.map((asset, idx) => (
          <div key={idx} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-gray-900">{asset.symbol}</h4>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${getRiskColor(asset.riskLevel)}`}>
                {asset.riskLevel} Risk
              </span>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-xs text-gray-500 font-medium">Volatility</div>
                <div className="text-lg font-bold text-gray-900">{asset.volatility}%</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 font-medium">Sharpe Ratio</div>
                <div className="text-lg font-bold text-gray-900">{asset.sharpeRatio}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 font-medium">Max Drawdown</div>
                <div className="text-lg font-bold text-red-600">{asset.maxDrawdown}%</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 font-medium">Beta</div>
                <div className="text-lg font-bold text-gray-900">{asset.beta}</div>
              </div>
            </div>

            {asset.recentSpikes && asset.recentSpikes.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="text-xs text-gray-500 font-medium mb-2">Recent Volatility Spikes</div>
                <div className="flex flex-wrap gap-2">
                  {asset.recentSpikes.map((spike, spikeIdx) => (
                    <span key={spikeIdx} className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs">
                      {spike.date}: {spike.change}%
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function AIInsights({ insights }) {
  if (!insights) return null;

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 card-hover">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
          <span className="text-2xl">🧠</span>
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">AI Market Insights</h3>
          <p className="text-sm text-purple-600">DeepSeek Analysis</p>
        </div>
      </div>

      <div className="space-y-4">
        {insights.correlationInsight && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
            <h4 className="font-semibold text-blue-800 mb-2">📊 Correlation Analysis</h4>
            <p className="text-blue-700 text-sm">{insights.correlationInsight}</p>
          </div>
        )}

        {insights.volatilityInsight && (
          <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-lg p-4 border border-orange-200">
            <h4 className="font-semibold text-orange-800 mb-2">⚡ Volatility Assessment</h4>
            <p className="text-orange-700 text-sm">{insights.volatilityInsight}</p>
          </div>
        )}

        {insights.marketTrend && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
            <h4 className="font-semibold text-green-800 mb-2">📈 Market Trend</h4>
            <p className="text-green-700 text-sm">{insights.marketTrend}</p>
          </div>
        )}

        {insights.riskAssessment && (
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
            <h4 className="font-semibold text-purple-800 mb-2">🎯 Risk Assessment</h4>
            <p className="text-purple-700 text-sm">{insights.riskAssessment}</p>
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500">
        Last updated: {insights.timestamp ? new Date(insights.timestamp).toLocaleString() : 'Unknown'}
      </div>
    </div>
  );
}

export default function Analytics() {
  const [filters, setFilters] = useState({
    assetType: 'stocks',
    primaryAsset: 'AAPL',
    secondaryAsset: 'MSFT',
    compareMode: false,
    dateRange: '1M'
  });

  const [loading, setLoading] = useState(false);
  const [chartData, setChartData] = useState(null);
  const [correlationData, setCorrelationData] = useState(null);
  const [riskData, setRiskData] = useState(null);
  const [aiInsights, setAiInsights] = useState(null);

  const handleFilterChange = async (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    
    if (key === 'analyze') {
      await runAnalysis();
    }
  };

  const runAnalysis = async () => {
    setLoading(true);
    try {
      // Generate mock data for demonstration
      // In production, these would be real API calls
      
      // Chart Data
      const mockChartData = generateMockChartData();
      setChartData(mockChartData);

      // Correlation Matrix
      const mockCorrelationData = generateMockCorrelationData();
      setCorrelationData(mockCorrelationData);

      // Risk Metrics
      const mockRiskData = generateMockRiskData();
      setRiskData(mockRiskData);

      // AI Insights
      const mockInsights = generateMockInsights();
      setAiInsights(mockInsights);

    } catch (error) {
      console.error('Analysis error:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateMockChartData = () => {
    const labels = [];
    const primaryData = [];
    const secondaryData = [];
    
    for (let i = 30; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      labels.push(date.toLocaleDateString());
      
      primaryData.push(150 + Math.random() * 50 + i * 2);
      if (filters.compareMode) {
        secondaryData.push(300 + Math.random() * 100 + i * 3);
      }
    }

    const datasets = [
      {
        label: filters.primaryAsset,
        data: primaryData,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.1
      }
    ];

    if (filters.compareMode) {
      datasets.push({
        label: filters.secondaryAsset,
        data: secondaryData,
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.1
      });
    }

    return { labels, datasets };
  };

  const generateMockCorrelationData = () => {
    const assets = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'BTC'];
    const matrix = assets.map(() => 
      assets.map(() => (Math.random() - 0.5) * 2)
    );

    // Ensure diagonal is 1.0
    for (let i = 0; i < assets.length; i++) {
      matrix[i][i] = 1.0;
    }

    return { assets, matrix };
  };

  const generateMockRiskData = () => {
    const assets = [
      {
        symbol: filters.primaryAsset,
        volatility: (Math.random() * 30 + 10).toFixed(1),
        sharpeRatio: (Math.random() * 2 + 0.5).toFixed(2),
        maxDrawdown: (Math.random() * 20 + 5).toFixed(1),
        beta: (Math.random() * 1.5 + 0.5).toFixed(2),
        riskLevel: Math.random() > 0.6 ? 'High' : Math.random() > 0.3 ? 'Medium' : 'Low',
        recentSpikes: [
          { date: '2025-08-15', change: '+5.2' },
          { date: '2025-08-10', change: '-3.8' }
        ]
      }
    ];

    if (filters.compareMode) {
      assets.push({
        symbol: filters.secondaryAsset,
        volatility: (Math.random() * 30 + 10).toFixed(1),
        sharpeRatio: (Math.random() * 2 + 0.5).toFixed(2),
        maxDrawdown: (Math.random() * 20 + 5).toFixed(1),
        beta: (Math.random() * 1.5 + 0.5).toFixed(2),
        riskLevel: Math.random() > 0.6 ? 'High' : Math.random() > 0.3 ? 'Medium' : 'Low',
        recentSpikes: [
          { date: '2025-08-12', change: '+7.1' },
          { date: '2025-08-08', change: '-4.3' }
        ]
      });
    }

    return { assets };
  };

  const generateMockInsights = () => {
    return {
      correlationInsight: `${filters.primaryAsset} and ${filters.secondaryAsset} show a ${(Math.random() > 0.5 ? '+' : '-')}${(Math.random() * 0.8 + 0.2).toFixed(2)} correlation over the ${filters.dateRange} period. This ${Math.random() > 0.5 ? 'positive' : 'negative'} relationship suggests ${Math.random() > 0.5 ? 'similar' : 'divergent'} market sentiment affecting both assets.`,
      volatilityInsight: `Market volatility has ${Math.random() > 0.5 ? 'increased' : 'decreased'} by ${(Math.random() * 15 + 5).toFixed(1)}% compared to historical averages. Recent ${Math.random() > 0.5 ? 'geopolitical events' : 'economic data releases'} have contributed to this ${Math.random() > 0.5 ? 'heightened' : 'reduced'} volatility environment.`,
      marketTrend: `The overall trend for ${filters.primaryAsset} appears ${Math.random() > 0.5 ? 'bullish' : 'bearish'} with ${Math.random() > 0.5 ? 'strong momentum' : 'consolidation patterns'} visible in the ${filters.dateRange} timeframe. Key support levels are holding ${Math.random() > 0.5 ? 'firm' : 'with some weakness'}.`,
      riskAssessment: `Current risk-adjusted returns suggest a ${Math.random() > 0.5 ? 'favorable' : 'cautious'} risk/reward profile. The Sharpe ratio indicates ${Math.random() > 0.5 ? 'efficient' : 'suboptimal'} performance relative to risk taken, with ${Math.random() > 0.5 ? 'institutional' : 'retail'} sentiment remaining ${Math.random() > 0.5 ? 'positive' : 'neutral'}.`,
      timestamp: new Date().toISOString()
    };
  };

  // Load initial analysis
  useEffect(() => {
    runAnalysis();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Professional Analytics</h1>
              <p className="text-gray-600 mt-1">Institutional-grade market analysis and risk assessment</p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-blue-600">
                <div className="w-2 h-2 bg-blue-500 rounded-full pulse-soft"></div>
                <span className="text-sm font-semibold">Live Data + AI</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header Filters */}
        <div className="mb-8">
          <HeaderFilters 
            filters={filters} 
            onFilterChange={handleFilterChange} 
            loading={loading}
          />
        </div>

        {/* Top Half - Interactive Charts */}
        <div className="grid gap-6 lg:grid-cols-3 mb-8">
          {/* Performance Chart - Takes 2 columns */}
          <div className="lg:col-span-2">
            {loading ? (
              <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
                <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-600">Loading chart data...</p>
              </div>
            ) : (
              <PerformanceChart 
                data={chartData} 
                compareMode={filters.compareMode}
                title={`${filters.primaryAsset}${filters.compareMode ? ` vs ${filters.secondaryAsset}` : ''} - ${filters.dateRange}`}
              />
            )}
          </div>

          {/* Risk Metrics - Sidebar */}
          <div>
            {loading ? (
              <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
                <div className="animate-spin h-8 w-8 border-2 border-orange-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-600">Calculating risks...</p>
              </div>
            ) : (
              <RiskMetrics riskData={riskData} />
            )}
          </div>
        </div>

        {/* Bottom Half - Correlation Matrix and AI Insights */}
        <div className="grid gap-6 lg:grid-cols-2 mb-8">
          {/* Correlation Heatmap */}
          <div>
            {loading ? (
              <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
                <div className="animate-spin h-8 w-8 border-2 border-green-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-600">Building correlation matrix...</p>
              </div>
            ) : (
              <CorrelationHeatmap correlationData={correlationData} />
            )}
          </div>

          {/* AI Insights */}
          <div>
            {loading ? (
              <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
                <div className="animate-spin h-8 w-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-600">Generating AI insights...</p>
              </div>
            ) : (
              <AIInsights insights={aiInsights} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}