export default function StatCard({ label, value, subtext, trend, changeValue }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-gray-600 text-sm font-medium">{label}</h3>
        {trend && (
          <div className={`px-2 py-1 rounded-full text-xs font-semibold ${
            trend === 'up' ? 'bg-green-50 text-green-700' : 
            trend === 'down' ? 'bg-red-50 text-red-700' : 
            'bg-gray-50 text-gray-700'
          }`}>
            {trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→'}
          </div>
        )}
      </div>
      
      <div className="flex items-end justify-between">
        <div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>
          {changeValue && (
            <p className={`text-sm font-semibold ${
              trend === 'up' ? 'text-green-600' : 
              trend === 'down' ? 'text-red-600' : 
              'text-gray-600'
            }`}>
              {trend === 'up' ? '+' : trend === 'down' ? '' : ''}{changeValue}
            </p>
          )}
        </div>
      </div>
      
      {subtext && <p className="text-gray-500 text-sm mt-2">{subtext}</p>}
    </div>
  );
}
