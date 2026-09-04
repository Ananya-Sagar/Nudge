const YahooFinance = require("yahoo-finance2").default;

const yahooFinance = new YahooFinance();

const getMarketData = async (ticker) => {
  const symbol = `${ticker}.NS`;

  const quote = await yahooFinance.quote(symbol);

  // Make sure Yahoo actually returned a usable stock quote
  if (
    !quote ||
    typeof quote.regularMarketPrice !== "number" ||
    !Number.isFinite(quote.regularMarketPrice)
  ) {
    throw new Error(
      `No valid market data found for ${symbol}`
    );
  }

  return {
    ticker: ticker.toUpperCase(),
    price: quote.regularMarketPrice,
    previousClose: quote.regularMarketPreviousClose,
    changePercent: quote.regularMarketChangePercent,
    volume: quote.regularMarketVolume,
    currency: quote.currency,
    marketState: quote.marketState,
  };
};

module.exports = {
  getMarketData,
};