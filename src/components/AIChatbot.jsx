import { useState } from 'react';

const fetchJSON = async (url, options = {}) => {
  const r = await fetch(url, options);
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
};

function ChatMessage({ message, isUser, timestamp }) {
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 fade-in-stagger`}>
      <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
        isUser 
          ? 'bg-green-500 text-white' 
          : 'bg-white text-gray-900 shadow-sm border border-gray-100'
      }`}>
        <div className="text-sm whitespace-pre-wrap">{message}</div>
        {timestamp && (
          <div className={`text-xs mt-1 ${isUser ? 'text-green-100' : 'text-gray-500'}`}>
            {new Date(timestamp).toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  );
}

function QuickQuestions({ onQuestionClick, disabled }) {
  const questions = [
    "What is a P/E ratio?",
    "Explain short selling",
    "What are dividends?",
    "How do options work?",
    "What's market volatility?",
    "Analyze AAPL stock",
    "What is Dollar Cost Averaging?",
    "Explain bull vs bear markets"
  ];

  return (
    <div className="mb-4">
      <h4 className="text-sm font-semibold text-gray-700 mb-3">Quick Questions:</h4>
      <div className="grid grid-cols-2 gap-2">
        {questions.map((question, idx) => (
          <button
            key={idx}
            onClick={() => onQuestionClick(question)}
            disabled={disabled}
            className="text-left p-3 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 rounded-lg text-sm hover:from-purple-100 hover:to-indigo-100 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed btn-hover"
          >
            {question}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function AIChatbot() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "👋 Hi! I'm MarketPulse AI, your financial education assistant. Ask me about stocks, trading concepts, or request analysis for any stock ticker!\n\n💡 Try: \"Analyze TSLA\" or \"What is a P/E ratio?\"",
      isUser: false,
      timestamp: new Date().toISOString()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || loading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    
    // Add user message
    const userMsg = {
      id: Date.now(),
      text: userMessage,
      isUser: true,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      // Check if this looks like a stock analysis request
      const stockMatch = userMessage.match(/analyze\s+(\w+)|(\w+)\s+stock|tell me about\s+(\w+)/i);
      const ticker = stockMatch ? (stockMatch[1] || stockMatch[2] || stockMatch[3]) : null;

      let response;
      if (ticker && ticker.length >= 1 && ticker.length <= 5) {
        // Use stock analysis endpoint
        response = await fetchJSON('https://marketpulse-2025-2.onrender.com/api/chatbot/analyze-stock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ticker: ticker.toUpperCase() })
        });
      } else {
        // Use general chatbot endpoint
        response = await fetchJSON('https://marketpulse-2025-2.onrender.com/api/chatbot/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: userMessage, ticker })
        });
      }

      // Add AI response
      const aiMsg = {
        id: Date.now() + 1,
        text: response.analysis || response.response,
        isUser: false,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, aiMsg]);

    } catch (error) {
      console.error('Chat error:', error);
      const errorMsg = {
        id: Date.now() + 1,
        text: "I'm sorry, I encountered an error. Please try again in a moment.\n\n💡 Ask me anything about finance or specific stocks!",
        isUser: false,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuestionClick = (question) => {
    setInputValue(question);
  };

  const clearChat = () => {
    setMessages([
      {
        id: 1,
        text: "👋 Hi! I'm MarketPulse AI, your financial education assistant. Ask me about stocks, trading concepts, or request analysis for any stock ticker!\n\n💡 Try: \"Analyze TSLA\" or \"What is a P/E ratio?\"",
        isUser: false,
        timestamp: new Date().toISOString()
      }
    ]);
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 card-hover">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
            <span className="text-2xl">🧠</span>
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">MarketPulse AI Tutor</h3>
            <p className="text-sm text-purple-600">Financial Education & Stock Analysis</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-purple-600">
            <div className="w-2 h-2 bg-purple-500 rounded-full pulse-soft"></div>
            <span className="text-sm font-semibold">DeepSeek AI</span>
          </div>
          <button
            onClick={clearChat}
            className="p-2 text-gray-400 hover:text-gray-600 transition-fast btn-hover"
            title="Clear chat"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="h-80 overflow-y-auto mb-4 bg-gray-50 rounded-lg p-4">
        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            message={message.text}
            isUser={message.isUser}
            timestamp={message.timestamp}
          />
        ))}
        {loading && (
          <div className="flex justify-start mb-4">
            <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-purple-500 border-t-transparent rounded-full"></div>
                <span className="text-sm text-gray-600">AI is thinking...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Questions */}
      <QuickQuestions onQuestionClick={handleQuestionClick} disabled={loading} />

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="flex gap-3">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Ask about finance or analyze a stock (e.g., 'Analyze AAPL')..."
          className="flex-1 px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-fast"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !inputValue.trim()}
          className="px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-semibold rounded-lg shadow-md hover:from-purple-600 hover:to-indigo-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed btn-hover"
        >
          {loading ? '...' : 'Ask'}
        </button>
      </form>
    </div>
  );
}