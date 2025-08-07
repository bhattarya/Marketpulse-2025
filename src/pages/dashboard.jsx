import Header from '../layout/Header'
import StatCard from '../components/StatCard'

export default function Dashboard() {
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

        {/* Asset Table */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-2">Market Sentiment Tracker</h2>
          <div className="bg-zinc-900 p-4 rounded-lg">[Asset table coming soon]</div>
        </div>
        
        <div className="bg-red-500 text-white p-4">
  Tailwind is working!
</div>

        {/* News Feed */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-2">AI-Powered Market Intelligence</h2>
          <div className="bg-zinc-900 p-4 rounded-lg">[News feed coming soon]</div>
        </div>
      </main>
    </div>
  );
}
