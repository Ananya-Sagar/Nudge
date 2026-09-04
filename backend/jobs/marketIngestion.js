const cron = require("node-cron");
const webpush = require("web-push");

const WatchlistItem = require("../models/WatchlistItem");
const PriceSnapshot = require("../models/PriceSnapshot");
const Alert = require("../models/Alert");
const PushSubscription = require("../models/PushSubscription");

const {
  getMarketData,
} = require("../services/marketData");

const YahooFinance =
  require("yahoo-finance2").default;

const yahooFinance =
  new YahooFinance();

/* =========================================================
   Market indices
   ========================================================= */

const MARKET_INDICES = [
  {
    ticker: "^NSEI",
    name: "NIFTY 50",
  },
  {
    ticker: "^BSESN",
    name: "SENSEX",
  },
  {
    ticker: "^NSEBANK",
    name: "NIFTY BANK",
  },
  {
    ticker: "^CNXIT",
    name: "NIFTY IT",
  },
];

/* =========================================================
   Web Push
   ========================================================= */

const pushEnabled =
  Boolean(
    process.env.VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY &&
      process.env.VAPID_EMAIL
  );

if (pushEnabled) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

/* =========================================================
   Send push notification
   ========================================================= */

const sendPushNotification = async (
  userId,
  ticker,
  condition,
  targetPrice,
  currentPrice
) => {
  if (!pushEnabled) {
    return;
  }

  const subscriptions =
    await PushSubscription.find({
      userId,
    });

  const direction =
    condition === "below"
      ? "below"
      : "above";

  const payload = JSON.stringify({
    title: `${ticker} price alert`,
    body:
      `${ticker} crossed ${direction} ₹${targetPrice.toLocaleString(
        "en-IN"
      )}. Current price: ₹${currentPrice.toLocaleString(
        "en-IN",
        {
          maximumFractionDigits: 2,
        }
      )}.`,
    icon: "/nudge-icon.png",
    badge: "/nudge-icon.png",
  });

  for (const subscription of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint:
            subscription.endpoint,

          keys: {
            p256dh:
              subscription.keys.p256dh,

            auth:
              subscription.keys.auth,
          },
        },
        payload
      );
    } catch (error) {
      console.error(
        "Push notification error:",
        error.message
      );

      if (
        error.statusCode === 404 ||
        error.statusCode === 410
      ) {
        await PushSubscription.deleteOne({
          _id:
            subscription._id,
        });
      }
    }
  }
};

/* =========================================================
   Check price alerts
   ========================================================= */

const checkPriceAlerts = async (
  ticker,
  price
) => {
  if (
    !Number.isFinite(
      Number(price)
    )
  ) {
    return;
  }

  const activeAlerts =
    await Alert.find({
      ticker,
      active: true,
    });

  for (const alert of activeAlerts) {
    const targetPrice =
      Number(
        alert.targetPrice
      );

    const triggered =
      alert.condition ===
        "below"
        ? price <= targetPrice
        : price >= targetPrice;

    if (!triggered) {
      continue;
    }

    alert.active = false;
    alert.triggeredAt =
      new Date();

    await alert.save();

    await sendPushNotification(
      alert.userId.toString(),
      ticker,
      alert.condition,
      targetPrice,
      price
    );

    console.log(
      `Alert triggered: ${ticker} ${alert.condition} ₹${targetPrice}`
    );
  }
};

/* =========================================================
   Save market index snapshot
   ========================================================= */

const saveIndexSnapshot =
  async (index) => {
    try {
      const quote =
        await yahooFinance.quote(
          index.ticker
        );

      const price = Number(
        quote.regularMarketPrice
      );

      const previousClose =
        Number(
          quote.regularMarketPreviousClose
        );

      if (
        !Number.isFinite(price)
      ) {
        throw new Error(
          "Index price unavailable"
        );
      }

      await PriceSnapshot.create({
        ticker: index.ticker,
        price,

        previousClose:
          Number.isFinite(
            previousClose
          )
            ? previousClose
            : null,

        volume:
          Number.isFinite(
            Number(
              quote.regularMarketVolume
            )
          )
            ? Number(
                quote.regularMarketVolume
              )
            : 0,

        capturedAt:
          new Date(),

        sourceLagSeconds: 0,

        source:
          "yahoo-finance-index",
      });

      console.log(
        `Saved ${index.name}: ${price}`
      );
    } catch (error) {
      console.error(
        `Failed to fetch ${index.name}:`,
        error.message
      );
    }
  };

/* =========================================================
   Historical stock data
   ========================================================= */

const bootstrapHistoricalData =
  async () => {
    try {
      console.log(
        "Checking historical market data..."
      );

      const watchlistItems =
        await WatchlistItem.find();

      const uniqueTickers = [
        ...new Set(
          watchlistItems.map(
            (item) =>
              item.ticker
          )
        ),
      ];

      for (const ticker of uniqueTickers) {
        try {
          const existingCount =
            await PriceSnapshot.countDocuments(
              {
                ticker,

                source:
                  "yahoo-finance-historical",
              }
            );

          if (
            existingCount >= 20
          ) {
            console.log(
              `${ticker} already has enough history.`
            );

            continue;
          }

          console.log(
            `Loading historical data for ${ticker}...`
          );

          const result =
            await yahooFinance.chart(
              `${ticker}.NS`,
              {
                period1:
                  new Date(
                    Date.now() -
                      35 *
                        24 *
                        60 *
                        60 *
                        1000
                  ),

                period2:
                  new Date(),

                interval: "1d",
              }
            );

          const quotes =
            result.quotes || [];

          for (const quote of quotes) {
            if (
              typeof quote.close !==
                "number" ||
              !Number.isFinite(
                quote.close
              )
            ) {
              continue;
            }

            const capturedAt =
              new Date(
                quote.date
              );

            const exists =
              await PriceSnapshot.findOne(
                {
                  ticker,
                  capturedAt,
                }
              );

            if (exists) {
              continue;
            }

            await PriceSnapshot.create({
              ticker,

              price:
                quote.close,

              previousClose:
                null,

              volume:
                typeof quote.volume ===
                "number"
                  ? quote.volume
                  : 0,

              capturedAt,

              sourceLagSeconds:
                null,

              source:
                "yahoo-finance-historical",
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

      console.log(
        "Historical bootstrap completed."
      );
    } catch (error) {
      console.error(
        "Historical bootstrap failed:",
        error.message
      );
    }
  };

/* =========================================================
   Live stock ingestion
   ========================================================= */

const runMarketIngestion =
  async () => {
    try {
      console.log(
        "Starting market data ingestion..."
      );

      const watchlistItems =
        await WatchlistItem.find();

      const uniqueTickers = [
        ...new Set(
          watchlistItems.map(
            (item) =>
              item.ticker
          )
        ),
      ];

      for (const ticker of uniqueTickers) {
        try {
          const marketData =
            await getMarketData(
              ticker
            );

          if (
            !Number.isFinite(
              Number(
                marketData.price
              )
            )
          ) {
            continue;
          }

          await PriceSnapshot.create({
            ticker:
              marketData.ticker,

            price:
              marketData.price,

            previousClose:
              Number.isFinite(
                Number(
                  marketData.previousClose
                )
              )
                ? Number(
                    marketData.previousClose
                  )
                : null,

            volume:
              marketData.volume || 0,

            capturedAt:
              new Date(),

            sourceLagSeconds: 0,

            source:
              "yahoo-finance",
          });

          console.log(
            `Saved snapshot for ${ticker}: ₹${marketData.price}`
          );

          await checkPriceAlerts(
            ticker,
            marketData.price
          );
        } catch (error) {
          console.error(
            `Failed to fetch ${ticker}:`,
            error.message
          );
        }
      }

      /* -----------------------------------------------------
         Market overview
         ----------------------------------------------------- */

      for (const index of MARKET_INDICES) {
        await saveIndexSnapshot(
          index
        );
      }

      console.log(
        "Market data ingestion completed."
      );
    } catch (error) {
      console.error(
        "Market ingestion failed:",
        error.message
      );
    }
  };

/* =========================================================
   Run every 15 minutes
   ========================================================= */

cron.schedule(
  "*/15 * * * *",
  runMarketIngestion
);

module.exports = {
  runMarketIngestion,
  bootstrapHistoricalData,
  checkPriceAlerts,
};