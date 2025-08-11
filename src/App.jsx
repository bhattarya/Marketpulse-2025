import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import Dashboard from './pages/Dashboard';
import Intelligence from './pages/Intelligence';

function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { path: '/', label: 'Dashboard', id: 'dashboard' },
    { path: '/intelligence', label: 'Intelligence', id: 'intelligence' },
    { path: '#', label: 'Analytics', id: 'analytics' },
    { path: '#', label: 'Portfolio', id: 'portfolio' },
    { path: '#', label: 'Settings', id: 'settings' }
  ];

  const handleNavigation = (path, id) => {
    if (path === '#') {
      // Handle placeholder pages
      return;
    }
    navigate(path);
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">M</span>
            </div>
            <span className="text-xl font-bold text-gray-900">MarketPulse</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.path, item.id)}
                className={`font-medium text-sm transition-colors ${
                  location.pathname === item.path
                    ? 'text-green-600'
                    : 'text-gray-600 hover:text-gray-900'
                } ${item.path === '#' ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                disabled={item.path === '#'}
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

          {/* Status and Mobile Menu Button */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
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
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavigation(item.path, item.id)}
                  className={`text-left px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${
                    location.pathname === item.path
                      ? 'text-green-600 bg-green-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  } ${item.path === '#' ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                  disabled={item.path === '#'}
                >
                  {item.label}
                  {item.id === 'intelligence' && (
                    <span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full text-xs font-semibold">
                      AI
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/intelligence" element={<Intelligence />} />
          {/* Placeholder routes for future pages */}
          <Route path="*" element={<Dashboard />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;