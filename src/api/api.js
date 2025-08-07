const COINGECKO_API =
  'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true';

const FINNHUB_API_KEY = 'd2aetnhr01qoad6pi37gd2aetnhr01qoad6pi380';
const FINNHUB_API = symbol =>
  `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`;

export async function fetchCryptoData() {
  try {
    const res = await fetch(COINGECKO_API);
    const data = await res.json();
    return [
      {
        type: 'crypto',
        name: 'Bitcoin',
        symbol: 'BTC',
        price: data.bitcoin.usd,
        change: data.bitcoin.usd_24h_change.toFixed(2),
      },
      {
        type: 'crypto',
        name: 'Ethereum',
        symbol: 'ETH',
        price: data.ethereum.usd,
        change: data.ethereum.usd_24h_change.toFixed(2),
      },
    ];
  } catch (e) {
    console.error('Crypto fetch error', e);
    return [];
  }
}

export async function fetchStockData() {
  const stocks = ['AAPL', 'TSLA'];
  const results = await Promise.all(
    stocks.map(async symbol => {
      try {
        const res = await fetch(FINNHUB_API(symbol));
        const data = await res.json();
        return {
          type: 'stock',
          name: symbol === 'AAPL' ? 'Apple' : 'Tesla',
          symbol,
          price: data.c,
          change: ((data.c - data.pc) / data.pc * 100).toFixed(2),
        };
      } catch (err) {
        console.error(`Error fetching ${symbol}:`, err);
        return null;
      }
    })
  );
  return results.filter(Boolean);
}
