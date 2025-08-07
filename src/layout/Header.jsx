export default function Header() {
  return (
    <header className="flex justify-between items-center p-4 border-b border-zinc-800 bg-black text-white">
      <h1 className="text-2xl font-bold text-green-500">MarketPulse</h1>
      <nav className="space-x-6 text-sm font-medium">
        <a href="#" className="hover:text-green-400">Dashboard</a>
        <a href="#" className="hover:text-green-400">Sentiment</a>
        <a href="#" className="hover:text-green-400">News</a>
      </nav>
    </header>
  );
}
