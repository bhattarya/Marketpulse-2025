function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 relative">
                <svg viewBox="0 0 40 40" className="w-full h-full">
                  <defs>
                    <linearGradient id="footerLogoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#059669" />
                    </linearGradient>
                  </defs>
                  <circle cx="20" cy="20" r="18" fill="url(#footerLogoGradient)"/>
                  <path d="M8 25 L12 22 L16 18 L20 15 L24 12 L28 16 L32 13" 
                        stroke="white" 
                        strokeWidth="2" 
                        fill="none" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"/>
                  <circle cx="12" cy="22" r="1.5" fill="white"/>
                  <circle cx="20" cy="15" r="1.5" fill="white"/>
                  <circle cx="28" cy="16" r="1.5" fill="white"/>
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
                <span className="text-lg font-bold">MarketPulse</span>
                <div className="text-xs text-green-400 font-semibold">Financial Intelligence</div>
              </div>
            </div>
            <p className="text-gray-400 text-sm mb-4 max-w-md">
              Advanced financial intelligence platform powered by AI. Real-time market analysis, 
              global insights, and intelligent forecasting for modern investors.
            </p>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-green-400">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm font-semibold">Live Data</span>
              </div>
              <div className="flex items-center gap-2 text-purple-400">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                <span className="text-sm font-semibold">AI Powered</span>
              </div>
            </div>
          </div>

          {/* Features */}
          <div>
            <h3 className="text-white font-semibold mb-4">Features</h3>
            <ul className="space-y-3 text-sm text-gray-400">
              <li className="hover:text-white transition-colors cursor-pointer">Real-time Dashboard</li>
              <li className="hover:text-white transition-colors cursor-pointer">Market Intelligence</li>
              <li className="hover:text-white transition-colors cursor-pointer">Global Updates</li>
              <li className="hover:text-white transition-colors cursor-pointer">Correlation Analysis</li>
              <li className="hover:text-white transition-colors cursor-pointer">AI News Insights</li>
              <li className="hover:text-white transition-colors cursor-pointer">FED Tracker</li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-white font-semibold mb-4">Resources</h3>
            <ul className="space-y-3 text-sm text-gray-400">
              <li className="hover:text-white transition-colors cursor-pointer">API Documentation</li>
              <li className="hover:text-white transition-colors cursor-pointer">Data Sources</li>
              <li className="hover:text-white transition-colors cursor-pointer">Privacy Policy</li>
              <li className="hover:text-white transition-colors cursor-pointer">Terms of Service</li>
              <li className="hover:text-white transition-colors cursor-pointer">Support Center</li>
              <li className="hover:text-white transition-colors cursor-pointer">Status Page</li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-800 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-sm text-gray-400 mb-4 md:mb-0">
              © {currentYear} MarketPulse. All rights reserved. Built with modern financial technology.
            </div>
            
            <div className="flex items-center gap-6 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <span className="text-xs">Powered by:</span>
                <div className="flex items-center gap-3">
                  <span className="bg-purple-900 text-purple-300 px-2 py-1 rounded text-xs font-semibold">OpenAI</span>
                  <span className="bg-blue-900 text-blue-300 px-2 py-1 rounded text-xs font-semibold">NewsData.io</span>
                  <span className="bg-green-900 text-green-300 px-2 py-1 rounded text-xs font-semibold">Finnhub</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="text-center mt-6 pt-6 border-t border-gray-800">
            <p className="text-xs text-gray-500">
              Market data provided for informational purposes only. Not intended as investment advice. 
              Please consult with qualified financial advisors before making investment decisions.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;