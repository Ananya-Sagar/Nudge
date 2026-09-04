const cron = require("node-cron");
const WatchlistItem = require("../models/WatchlistItem");
const PriceSnapshot = require("../models/PriceSnapshot");
const { getMarketData } = require("../services/marketData");
const YahooFinance = require("yahoo-finance2").default;
const yahooFinance = new YahooFinance();

const bootstrapHistoricalData = async () => {
  try {
    console.log("Checking historical market data...");

    const watchlistItems = await WatchlistItem.find();

    const uniqueTickers = [
      ...new Set(watchlistItems.map((item) => item.ticker)),
    ];

    for (const ticker of uniqueTickers) {
      try {
        const existingCount = await PriceSnapshot.countDocuments({
  ticker,
  source: "yahoo-finance-historical",
});
        if (existingCount >= 20) {
          console.log(
            `${ticker} already has enough history.`
          );
          continue;
        }

        console.log(
          `Loading historical data for ${ticker}...`
        );

        const symbol = `${ticker}.NS`;

        const result = await yahooFinance.chart(symbol, {
          period1: new Date(
            Date.now() - 35 * 24 * 60 * 60 * 1000
          ),
          period2: new Date(),
          interval: "1d",
        });

        const quotes = result.quotes || [];

        for (const quote of quotes) {
          if (
            typeof quote.close !== "number" ||
            !Number.isFinite(quote.close)
          ) {
            continue;
          }

          const capturedAt = new Date(quote.date);

          const alreadyExists =
            await PriceSnapshot.findOne({
              ticker,
              capturedAt,
            });

          if (alreadyExists) {
            continue;
          }

          await PriceSnapshot.create({
            ticker,
            price: quote.close,
            volume:
              typeof quote.volume === "number"
                ? quote.volume
                : 0,
            capturedAt,
            sourceLagSeconds: null,
            source: "yahoo-finance-historical",
          });
        }

        console.log(
          `Historical data loaded for ${ticker}: ${quotes.length} records`
        );
      } catch (error) {
        console.error(
          `Historical bootstrap failed for ${ticker}:`,
          error.message
        );
      }
    }

    console.log("Historical bootstrap completed.");
  } catch (error) {
    console.error(
      "Historical bootstrap failed:",
      error.message
    );
  }
};

const runMarketIngestion = async () => {
  try {
    console.log("Starting market data ingestion...");

    const watchlistItems = await WatchlistItem.find();

    const uniqueTickers = [
      ...new Set(watchlistItems.map((item) => item.ticker)),
    ];

    for (const ticker of uniqueTickers) {
      try {
        const marketData = await getMarketData(ticker);

        const snapshot = new PriceSnapshot({
          ticker: marketData.ticker,
          price: marketData.price,
          volume: marketData.volume || 0,
          capturedAt: new Date(),
          sourceLagSeconds: 0,
          source: "yahoo-finance",
        });

        await snapshot.save();

        console.log(
          `Saved snapshot for ${ticker}: ₹${marketData.price}`
        );
      } catch (error) {
        console.error(
          `Failed to fetch ${ticker}:`,
          error.message
        );
      }
    }

    console.log("Market data ingestion completed.");
  } catch (error) {
    console.error(
      "Market ingestion failed:",
      error.message
    );
  }
};

cron.schedule("*/15 * * * *", runMarketIngestion);

module.exports = {
  runMarketIngestion,
  bootstrapHistoricalData,
};