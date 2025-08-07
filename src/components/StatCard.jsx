export default function StatCard({ label, value, subtext }) {
  return (
    <div className="bg-zinc-900 text-white p-4 rounded-lg shadow w-full">
      <h3 className="text-sm text-gray-400">{label}</h3>
      <p className="text-2xl font-semibold">{value}</p>
      {subtext && <p className="text-xs text-gray-500">{subtext}</p>}
    </div>
  );
}
