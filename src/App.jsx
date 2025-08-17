import { useNavigate, NavLink, Outlet } from 'react-router-dom';
import { useState } from 'react';
import Footer from './components/Footer';

function Navigation() {
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const handleSearch = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setSearchLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      setSearchResults(data);
      setShowSearchResults(true);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const selectStock = (stock) => {
    setSearchQuery('');
    setShowSearchResults(false);
    navigate(`/stock/${stock.symbol}`);
  };

  const addStockToDashboard = (stock, event) => {
    event.stopPropagation();
    // Add stock to dashboard by updating URL with multiple symbols
    const currentSymbol = new URLSearchParams(window.location.search).get('symbol');
    const symbols = currentSymbol ? [currentSymbol, stock.symbol] : [stock.symbol];
    const uniqueSymbols = [...new Set(symbols)].slice(0, 5); // Max 5 symbols
    navigate(`/?symbols=${uniqueSymbols.join(',')}`);
    setSearchQuery('');
    setShowSearchResults(false);
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-10 h-10 relative">
              <svg viewBox="0 0 40 40" className="w-full h-full">
                {/* Background gradient circle */}
                <defs>
                  <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#059669" />
                  </linearGradient>
                  <linearGradient id="pulseGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#34d399" />
                    <stop offset="100%" stopColor="#10b981" />
                  </linearGradient>
                </defs>
                
                {/* Main circle */}
                <circle cx="20" cy="20" r="18" fill="url(#logoGradient)" className="drop-shadow-sm"/>
                
                {/* Pulse waves */}
                <circle cx="20" cy="20" r="12" fill="none" stroke="url(#pulseGradient)" strokeWidth="1" opacity="0.6">
                  <animate attributeName="r" values="8;16;8" dur="2s" repeatCount="indefinite"/>
                  <animate attributeName="opacity" values="0.8;0.2;0.8" dur="2s" repeatCount="indefinite"/>
                </circle>
                <circle cx="20" cy="20" r="8" fill="none" stroke="url(#pulseGradient)" strokeWidth="1" opacity="0.4">
                  <animate attributeName="r" values="4;12;4" dur="2s" begin="0.5s" repeatCount="indefinite"/>
                  <animate attributeName="opacity" values="0.6;0.1;0.6" dur="2s" begin="0.5s" repeatCount="indefinite"/>
                </circle>
                
                {/* Market trend line */}
                <path d="M8 25 L12 22 L16 18 L20 15 L24 12 L28 16 L32 13" 
                      stroke="white" 
                      strokeWidth="2" 
                      fill="none" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                      className="drop-shadow-sm"/>
                
                {/* Data points */}
                <circle cx="12" cy="22" r="1.5" fill="white" className="drop-shadow-sm"/>
                <circle cx="20" cy="15" r="1.5" fill="white" className="drop-shadow-sm"/>
                <circle cx="28" cy="16" r="1.5" fill="white" className="drop-shadow-sm"/>
                
                {/* Letter M overlay */}
                <path d="M14 26 L14 18 L17 22 L20 18 L20 26 M23 26 L23 18 L26 26" 
                      stroke="white" 
                      strokeWidth="1.5" 
                      fill="none" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                      opacity="0.9"/>
              </svg>
            </div>
            <div>
              <span className="text-xl font-bold text-gray-900">MarketPulse</span>
              <div className="text-xs text-green-600 font-semibold -mt-1">Financial Intelligence</div>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {/* Dashboard */}
            <NavLink
              to="/"
              className={({ isActive }) =>
                `font-medium text-sm transition-fast ${
                  isActive ? 'text-green-600' : 'text-gray-600 hover:text-gray-900'
                }`
              }
            >
              Dashboard
            </NavLink>

            {/* Intelligence */}
            <NavLink
              to="/intelligence"
              className={({ isActive }) =>
                `font-medium text-sm transition-fast ${
                  isActive ? 'text-green-600' : 'text-gray-600 hover:text-gray-900'
                }`
              }
            >
              Intelligence
              <span className="ml-1 bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full text-xs font-semibold">
                AI
              </span>
            </NavLink>

            {/* Analytics */}
            <NavLink
              to="/analytics"
              className={({ isActive }) =>
                `font-medium text-sm transition-fast ${
                  isActive ? 'text-green-600' : 'text-gray-600 hover:text-gray-900'
                }`
              }
            >
              Analytics
              <span className="ml-1 bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full text-xs font-semibold">
                ✓
              </span>
            </NavLink>

            {/* News */}
            <NavLink
              to="/news"
              className={({ isActive }) =>
                `font-medium text-sm transition-fast ${
                  isActive ? 'text-green-600' : 'text-gray-600 hover:text-gray-900'
                }`
              }
            >
              News
              <span className="ml-1 bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full text-xs font-semibold">
                AI
              </span>
            </NavLink>

            {/* Global Updates */}
            <NavLink
              to="/global-updates"
              className={({ isActive }) =>
                `font-medium text-sm transition-fast ${
                  isActive ? 'text-green-600' : 'text-gray-600 hover:text-gray-900'
                }`
              }
            >
              Global Updates
              <span className="ml-1 bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full text-xs font-semibold">
                🌍
              </span>
            </NavLink>

            {/* Search */}
            <div className="relative">
              <div className="flex items-center">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search stocks/crypto..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      handleSearch(e.target.value);
                    }}
                    className="w-64 px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <svg className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              {/* Search Results Dropdown */}
              {showSearchResults && (
                <div className="absolute top-full left-0 w-80 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
                  {searchLoading ? (
                    <div className="p-4 text-center">
                      <div className="animate-spin h-4 w-4 border-2 border-green-500 border-t-transparent rounded-full mx-auto"></div>
                    </div>
                  ) : searchResults.length > 0 ? (
                    searchResults.map((result, idx) => (
                      <div
                        key={idx}
                        className="flex items-center px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                      >
                        <button
                          onClick={() => selectStock(result)}
                          className="flex-1 text-left btn-hover"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-semibold text-gray-900">{result.symbol}</div>
                              <div className="text-sm text-gray-600">{result.name}</div>
                            </div>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              result.type === 'stock' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                            }`}>
                              {result.type?.toUpperCase()}
                            </span>
                          </div>
                        </button>
                        <button
                          onClick={(e) => addStockToDashboard(result, e)}
                          className="ml-3 p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-fast btn-hover"
                          title="Add to dashboard"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-gray-500">No results found</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Status and Mobile Menu Button */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full pulse-soft"></div>
              <span className="text-sm font-semibold hidden sm:inline">Live</span>
            </div>
            
            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d={isMobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            <div className="flex flex-col gap-3">
              {/* Dashboard - Mobile */}
              <NavLink
                to="/"
                onClick={closeMobileMenu}
                className={({ isActive }) =>
                  `text-left px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${
                    isActive
                      ? 'text-green-600 bg-green-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`
                }
              >
                Dashboard
              </NavLink>

              {/* Intelligence - Mobile */}
              <NavLink
                to="/intelligence"
                onClick={closeMobileMenu}
                className={({ isActive }) =>
                  `text-left px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${
                    isActive
                      ? 'text-green-600 bg-green-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`
                }
              >
                Intelligence
                <span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full text-xs font-semibold">
                  AI
                </span>
              </NavLink>

              {/* Analytics - Mobile */}
              <NavLink
                to="/analytics"
                onClick={closeMobileMenu}
                className={({ isActive }) =>
                  `text-left px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${
                    isActive
                      ? 'text-green-600 bg-green-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`
                }
              >
                Analytics
                <span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full text-xs font-semibold">
                  ✓
                </span>
              </NavLink>

              {/* News - Mobile */}
              <NavLink
                to="/news"
                onClick={closeMobileMenu}
                className={({ isActive }) =>
                  `text-left px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${
                    isActive
                      ? 'text-green-600 bg-green-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`
                }
              >
                News
                <span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full text-xs font-semibold">
                  AI
                </span>
              </NavLink>

              {/* Global Updates - Mobile */}
              <NavLink
                to="/global-updates"
                onClick={closeMobileMenu}
                className={({ isActive }) =>
                  `text-left px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${
                    isActive
                      ? 'text-green-600 bg-green-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`
                }
              >
                Global Updates
                <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full text-xs font-semibold">
                  🌍
                </span>
              </NavLink>

            </div>
          </div>
        )}
      </div>
    </header>
  );
}

function App() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navigation />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

export default App;