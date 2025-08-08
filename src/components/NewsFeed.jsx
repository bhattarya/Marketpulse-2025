import { useEffect, useState } from "react";

export default function NewsFeed({ ticker }) {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ticker) return;
    setLoading(true);
    fetch(`/api/news?ticker=${ticker}`)
      .then(res => res.json())
      .then(data => {
        setNews(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("News fetch error:", err);
        setLoading(false);
      });
  }, [ticker]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-md p-4 mt-6">
        <p className="text-gray-500">Loading AI-powered news...</p>
      </div>
    );
  }

  if (!news.length) {
    return (
      <div className="bg-white rounded-xl shadow-md p-4 mt-6">
        <p className="text-gray-500">No news available.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-4 mt-6">
      <h2 className="text-xl font-bold mb-4">
        Latest AI News {ticker && `for ${ticker}`}
      </h2>
      <div className="space-y-4">
        {news.map((item, idx) => (
          <a
            key={idx}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block hover:bg-gray-50 transition rounded-lg p-3"
          >
            <div className="flex items-start space-x-4">
              <img
                src={item.image || "https://via.placeholder.com/80"}
                alt={item.title}
                className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{item.title}</h3>
                  <span
                    className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                      item.sentiment === "Positive"
                        ? "bg-green-100 text-green-700"
                        : item.sentiment === "Negative"
                        ? "bg-red-100 text-red-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {item.sentiment}
                  </span>
                </div>
                <p className="text-sm text-gray-700 mt-1">{item.summary}</p>
                <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                  <span>
                    {item.source} •{" "}
                    {new Date(item.publishedAt).toLocaleString()}
                  </span>
                  <span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-md text-[10px]">
                    AI
                  </span>
                </div>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
