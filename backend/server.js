require("dotenv").config();

const dns = require("dns");
dns.setServers(["8.8.8.8"]);

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const WatchlistItem = require("./models/WatchlistItem");
const PriceSnapshot = require("./models/PriceSnapshot");
const { getMarketData } = require("./services/marketData");

const {
  calculateSignal,
  calculateReturns,
} = require("./services/signalEngine");

const UserViewState = require("./models/UserViewState");
const SignalEvent = require("./models/SignalEvent");
const UserPreference = require("./models/UserPreference");
const UserFeedback = require("./models/UserFeedback");

const YahooFinance =
  require("yahoo-finance2").default;

const yahooFinance = new YahooFinance();

/* =========================
   App configuration
   ========================= */

const app = express();
const PORT = process.env.PORT || 5000;

const PERSONALIZATION_THRESHOLD = 1;

/* =========================
   Market context mapping
   ========================= */

const SECTOR_INDICES = {
  INFY: {
    name: "IT",
    symbol: "^CNXIT",
  },
  TCS: {
    name: "IT",
    symbol: "^CNXIT",
  },
  WIPRO: {
    name: "IT",
    symbol: "^CNXIT",
  },
  HDFCBANK: {
    name: "Banking",
    symbol: "^NSEBANK",
  },
  ICICIBANK: {
    name: "Banking",
    symbol: "^NSEBANK",
  },
  SBIN: {
    name: "Banking",
    symbol: "^NSEBANK",
  },
  AXISBANK: {
    name: "Banking",
    symbol: "^NSEBANK",
  },
  RELIANCE: {
    name: "NIFTY 50",
    symbol: "^NSEI",
  },
  ITC: {
    name: "NIFTY 50",
    symbol: "^NSEI",
  },
  LT: {
    name: "NIFTY 50",
    symbol: "^NSEI",
  },
};

/* =========================
   Helpers
   ========================= */

const calculatePersonalizedScore = (
  signalScore,
  interestWeight
) => {
  const safeSignalScore = Math.max(
    0,
    Number(signalScore) || 0
  );

  const safeInterestWeight = Math.max(
    0,
    Math.min(
      1,
      Number(interestWeight) || 0
    )
  );

  return Number(
    (
      safeSignalScore *
      safeInterestWeight
    ).toFixed(2)
  );
};

const getMarketContext = async (ticker) => {
  const context =
    SECTOR_INDICES[ticker] || {
      name: "NIFTY 50",
      symbol: "^NSEI",
    };

  try {
    const quote =
      await yahooFinance.quote(
        context.symbol
      );

    const changePercent =
      Number(
        quote.regularMarketChangePercent
      );

    return {
      name: context.name,
      symbol: context.symbol,
      changePercent: Number.isFinite(
        changePercent
      )
        ? Number(
            changePercent.toFixed(2)
          )
        : 0,
    };
  } catch (error) {
    console.error(
      `Context error for ${ticker}:`,
      error.message
    );

    return null;
  }
};

/* =========================
   Middleware
   ========================= */

app.use(cors());
app.use(express.json());

/* =========================
   Anonymous user identity
   ========================= */

app.use((req, res, next) => {
  req.userId =
    req.headers["x-user-id"] ||
    "demo-user";

  next();
});

/* =========================
   MongoDB connection
   ========================= */

console.log(
  "Trying to connect to MongoDB..."
);

mongoose
  .connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 10000,
  })
  .then(async () => {
    console.log(
      "MongoDB connected successfully!"
    );

    const {
      runMarketIngestion,
      bootstrapHistoricalData,
    } = require("./jobs/marketIngestion");

    await bootstrapHistoricalData();
    runMarketIngestion();
  })
  .catch((error) => {
    console.error(
      "MongoDB connection failed:"
    );

    console.error(error.message);
  });

/* =========================
   Health check
   ========================= */

app.get("/", (req, res) => {
  res.json({
    message:
      "Groww Code backend is running!",
    database: "MongoDB",
  });
});

/* =========================
   Watchlist
   ========================= */

app.get(
  "/api/watchlist",
  async (req, res) => {
    try {
      const watchlist =
        await WatchlistItem.find({
          userId: req.userId,
        });

      res.json(watchlist);
    } catch (error) {
      console.error(
        "Fetch watchlist error:",
        error.message
      );

      res.status(500).json({
        message:
          "Failed to fetch watchlist",
      });
    }
  }
);

app.post(
  "/api/watchlist",
  async (req, res) => {
    try {
      const userId = req.userId;

      const ticker =
        req.body.ticker
          ?.trim()
          .toUpperCase();

      if (!ticker) {
        return res.status(400).json({
          message:
            "Ticker is required",
        });
      }

      if (
        !/^[A-Z0-9.-]{1,20}$/.test(
          ticker
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid ticker format",
        });
      }

      /* Verify that the stock exists */

      try {
        await getMarketData(ticker);
      } catch (error) {
        return res.status(400).json({
          message:
            `Stock "${ticker}" was not found.`,
        });
      }

      /* Prevent duplicates */

      const existingStock =
        await WatchlistItem.findOne({
          userId,
          ticker,
        });

      if (existingStock) {
        return res.status(409).json({
          message:
            "Stock already exists in watchlist",
        });
      }

      const newStock =
        new WatchlistItem({
          userId,
          ticker,
        });

      const savedStock =
        await newStock.save();

      res.status(201).json(
        savedStock
      );
    } catch (error) {
      console.error(
        "Add stock error:",
        error.message
      );

      res.status(500).json({
        message:
          "Failed to add stock",
      });
    }
  }
);

app.delete(
  "/api/watchlist/:id",
  async (req, res) => {
    try {
      const deletedStock =
        await WatchlistItem.findOneAndDelete(
          {
            _id: req.params.id,
            userId: req.userId,
          }
        );

      if (!deletedStock) {
        return res.status(404).json({
          message:
            "Stock not found",
        });
      }

      res.json({
        message:
          "Stock removed successfully",
      });
    } catch (error) {
      console.error(
        "Remove stock error:",
        error.message
      );

      res.status(500).json({
        message:
          "Failed to remove stock",
      });
    }
  }
);

/* =========================
   Price history
   ========================= */

app.get(
  "/api/market/:ticker/history",
  async (req, res) => {
    try {
      const ticker =
        req.params.ticker
          .trim()
          .toUpperCase();

      const snapshots =
        await PriceSnapshot.find({
          ticker,
          source:
            "yahoo-finance-historical",
        })
          .sort({
            capturedAt: 1,
          })
          .limit(35)
          .lean();

      const history =
        snapshots.map(
          (snapshot) => ({
            date:
              snapshot.capturedAt,
            price:
              snapshot.price,
          })
        );

      res.json(history);
    } catch (error) {
      console.error(
        "Price history error:",
        error.message
      );

      res.status(500).json({
        message:
          "Could not fetch price history.",
      });
    }
  }
);

/* =========================
   Market data
   ========================= */

app.get(
  "/api/market/:ticker",
  async (req, res) => {
    const ticker =
      req.params.ticker
        .trim()
        .toUpperCase();

    try {
      /* Get current market data */

      const marketData =
        await getMarketData(
          ticker
        );

      /* Get historical prices */

      const snapshots =
        await PriceSnapshot.find({
          ticker,
          source:
            "yahoo-finance-historical",
        })
          .sort({
            capturedAt: -1,
          })
          .limit(31);

      const historicalPrices =
        snapshots
          .slice()
          .reverse()
          .map(
            (snapshot) =>
              snapshot.price
          );

      /* Historical returns */

      const historicalReturns =
        calculateReturns(
          historicalPrices
        );

      /* Historical volume */

      const historicalVolumes =
        snapshots
          .map(
            (snapshot) =>
              snapshot.volume
          )
          .filter(
            (volume) =>
              volume > 0
          );

      /* Current return */

      const currentReturn =
        marketData.previousClose >
        0
          ? (
              (
                marketData.price -
                marketData.previousClose
              ) /
              marketData.previousClose
            ) * 100
          : 0;

      /* Objective signal */

      const signal =
        calculateSignal({
          currentReturn,
          historicalReturns,
          currentVolume:
            marketData.volume || 0,
          historicalVolumes,
        });

      /* Save live snapshot */

      await PriceSnapshot.create({
        ticker: marketData.ticker,
        price: marketData.price,
        volume:
          marketData.volume || 0,
        capturedAt: new Date(),
        sourceLagSeconds:
          null,
        source:
          "yahoo-finance",
      });

      res.json({
        ...marketData,
        ...signal,
        stale: false,
      });
    } catch (error) {
      console.error(
        `Market data error for ${ticker}:`,
        error.message
      );

      /* Stale-data fallback */

      try {
        const latestSnapshot =
          await PriceSnapshot.findOne({
            ticker,
          }).sort({
            capturedAt: -1,
          });

        if (!latestSnapshot) {
          return res.status(503).json({
            message:
              "Market data is temporarily unavailable and no previous data exists.",
            stale: true,
          });
        }

        res.json({
          ticker,
          price:
            latestSnapshot.price,
          volume:
            latestSnapshot.volume,
          capturedAt:
            latestSnapshot.capturedAt,
          source:
            latestSnapshot.source,
          stale: true,
          urgency: "Low",
          signalScore: 0,
          reason:
            "Live market data is temporarily unavailable. Showing the last available snapshot.",
        });
      } catch (fallbackError) {
        console.error(
          "Snapshot fallback error:",
          fallbackError.message
        );

        res.status(503).json({
          message:
            "Market data is temporarily unavailable.",
        });
      }
    }
  }
);

/* =========================
   Market view + personalization
   ========================= */

app.post(
  "/api/market/:ticker/view",
  async (req, res) => {
    try {
      const ticker =
        req.params.ticker
          .trim()
          .toUpperCase();

      const userId =
        req.userId;

      /* Current market data */

      const marketData =
        await getMarketData(
          ticker
        );

      /* Historical data */

      const snapshots =
        await PriceSnapshot.find({
          ticker,
          source:
            "yahoo-finance-historical",
        })
          .sort({
            capturedAt: -1,
          })
          .limit(31);

      const historicalPrices =
        snapshots
          .slice()
          .reverse()
          .map(
            (snapshot) =>
              snapshot.price
          );

      const historicalReturns =
        calculateReturns(
          historicalPrices
        );

      const historicalVolumes =
        snapshots
          .map(
            (snapshot) =>
              snapshot.volume
          )
          .filter(
            (volume) =>
              volume > 0
          );

      /* Current return */

      const currentReturn =
        marketData.previousClose >
        0
          ? (
              (
                marketData.price -
                marketData.previousClose
              ) /
              marketData.previousClose
            ) * 100
          : 0;

      /* Objective signal */

      const signal =
        calculateSignal({
          currentReturn,
          historicalReturns,
          currentVolume:
            marketData.volume || 0,
          historicalVolumes,
        });

      /* User preference */

      const preference =
        await UserPreference.findOneAndUpdate(
          { userId },
          {},
          {
            returnDocument:
              "after",
            upsert: true,
            setDefaultsOnInsert:
              true,
          }
        );

      /* Previous user view */

      const previousView =
        await UserViewState.findOne({
          userId,
          ticker,
        });

      /* Personalization */

      const interestWeight =
        Math.max(
          0,
          Math.min(
            1,
            Number(
              preference.priceMoveWeight
            ) || 0
          )
        );

      const personalizedScore =
        calculatePersonalizedScore(
          signal.signalScore,
          interestWeight
        );

      /* Update latest user view */

      const viewState =
        await UserViewState.findOneAndUpdate(
          {
            userId,
            ticker,
          },
          {
            lastSeenPrice:
              marketData.price,

            lastSeenAt:
              new Date(),
          },
          {
            returnDocument:
              "after",
            upsert: true,
          }
        );

      /* Decide whether to surface */

      let signalEvent = null;

      const userHasSeenStock =
        Boolean(previousView);

      const objectivelyMeaningful =
        signal.urgency !==
        "Low";

      let meaningfulSinceLastView =
        false;

      if (
        previousView &&
        previousView.lastSeenPrice >
          0
      ) {
        const priceChange =
          Math.abs(
            (
              (
                marketData.price -
                previousView.lastSeenPrice
              ) /
              previousView.lastSeenPrice
            ) * 100
          );

        meaningfulSinceLastView =
          priceChange >= 0.1;
      }

      const hasEnoughHistory =
        historicalReturns.length >=
          20 &&
        historicalVolumes.length >=
          20;

      const shouldSurfaceSignal =
        hasEnoughHistory &&
        userHasSeenStock &&
        objectivelyMeaningful &&
        meaningfulSinceLastView &&
        personalizedScore >=
          PERSONALIZATION_THRESHOLD;

      /* Create signal event */

      if (shouldSurfaceSignal) {
        signalEvent =
          await SignalEvent.create(
            {
              userId,
              ticker,

              signalType:
                "PRICE_MOVE",

              magnitude:
                Number(
                  Math.abs(
                    currentReturn
                  ).toFixed(2)
                ),

              reason:
                `${signal.reason} Personalized relevance: ${personalizedScore.toFixed(
                  2
                )}.`,

              shownToUser:
                true,
            }
          );
      }

      res.json({
        viewState,
        signalEvent,
      });
    } catch (error) {
      console.error(
        "View state error:",
        error.message
      );

      res.status(500).json({
        message:
          "Failed to update view state",
      });
    }
  }
);

/* =========================
   Signal history
   ========================= */

app.get(
  "/api/signals/:ticker/history",
  async (req, res) => {
    try {
      const ticker =
        req.params.ticker
          .trim()
          .toUpperCase();

      const userId =
        req.userId;

      const signals =
        await SignalEvent.find({
          ticker,
          userId,
        })
          .sort({
            createdAt: -1,
          })
          .limit(20);

      res.json(signals);
    } catch (error) {
      console.error(
        "Signal history error:",
        error.message
      );

      res.status(500).json({
        message:
          "Failed to fetch signal history",
      });
    }
  }
);

/* =========================
   Feedback
   ========================= */

app.post(
  "/api/signals/:signalId/feedback",
  async (req, res) => {
    try {
      const userId =
        req.userId;

      const signalId =
        req.params.signalId;

      const { feedback } =
        req.body;

      /* Validate feedback */

      if (
        ![
          "useful",
          "not_for_me",
        ].includes(feedback)
      ) {
        return res.status(400).json({
          message:
            "Feedback must be 'useful' or 'not_for_me'",
        });
      }

      /* Find signal */

      const signal =
        await SignalEvent.findOne({
          _id: signalId,
          userId,
        });

      if (!signal) {
        return res.status(404).json({
          message:
            "Signal not found",
        });
      }

      /* Prevent duplicate feedback */

      const existingFeedback =
        await UserFeedback.findOne({
          userId,
          signalEventId:
            signal._id,
        });

      if (existingFeedback) {
        return res.status(409).json({
          message:
            "Feedback already recorded for this signal",
        });
      }

      /* Store feedback */

      const savedFeedback =
        await UserFeedback.create(
          {
            userId,

            signalEventId:
              signal._id,

            ticker:
              signal.ticker,

            feedback,
          }
        );

      /* Get user preference */

      const preference =
        await UserPreference.findOneAndUpdate(
          { userId },
          {},
          {
            returnDocument:
              "after",
            upsert: true,
            setDefaultsOnInsert:
              true,
          }
        );

      /* Adjust preference */

      const adjustment =
        feedback === "useful"
          ? 0.1
          : -0.1;

      preference.priceMoveWeight =
        Math.max(
          0,
          Math.min(
            1,
            preference.priceMoveWeight +
              adjustment
          )
        );

      await preference.save();

      res.json({
        message:
          "Feedback recorded",

        feedback:
          savedFeedback,

        priceMoveWeight:
          preference.priceMoveWeight,
      });
    } catch (error) {
      console.error(
        "Feedback error:",
        error.message
      );

      res.status(500).json({
        message:
          "Failed to record feedback",
      });
    }
  }
);

/* =========================
   Development test signal
   ========================= */

app.post(
  "/api/dev/test-signal",
  async (req, res) => {
    try {
      const userId =
        req.userId;

      const ticker =
        req.body.ticker
          ?.trim()
          .toUpperCase() ||
        "RELIANCE";

      const signalEvent =
        await SignalEvent.create({
          userId,
          ticker,
          signalType:
            "PRICE_MOVE",

          magnitude: 3.25,

          reason:
            "Demo signal: price movement is unusually large and confirmed by elevated volume.",

          shownToUser:
            true,
        });

      res.status(201).json(
        signalEvent
      );
    } catch (error) {
      console.error(
        "Test signal error:",
        error.message
      );

      res.status(500).json({
        message:
          "Failed to create test signal",
      });
    }
  }
);

/* =========================
   Development personalization test
   ========================= */

app.post(
  "/api/dev/personalization-test",
  async (req, res) => {
    try {
      const signalScore =
        Number(
          req.body.signalScore
        ) || 0;

      const preference =
        await UserPreference.findOneAndUpdate(
          {
            userId:
              req.userId,
          },
          {},
          {
            returnDocument:
              "after",
            upsert: true,
            setDefaultsOnInsert:
              true,
          }
        );

      const personalizedScore =
        calculatePersonalizedScore(
          signalScore,
          preference.priceMoveWeight
        );

      const shouldSurface =
        personalizedScore >=
        PERSONALIZATION_THRESHOLD;

      res.json({
        signalScore,

        interestWeight:
          preference.priceMoveWeight,

        personalizedScore,

        threshold:
          PERSONALIZATION_THRESHOLD,

        shouldSurface,
      });
    } catch (error) {
      console.error(
        "Personalization test error:",
        error.message
      );

      res.status(500).json({
        message:
          "Personalization test failed",
      });
    }
  }
);

/* =========================
   Dashboard
   ========================= */

app.get(
  "/api/dashboard",
  async (req, res) => {
    try {
      const userId =
        req.userId;

      /* User preference */

      const preference =
        await UserPreference.findOneAndUpdate(
          { userId },
          {},
          {
            returnDocument:
              "after",
            upsert: true,
            setDefaultsOnInsert:
              true,
          }
        );

      const interestWeight =
        Math.max(
          0,
          Math.min(
            1,
            Number(
              preference.priceMoveWeight
            ) || 0
          )
        );

      /* Watchlist */

      const watchlist =
        await WatchlistItem.find({
          userId,
        }).lean();

      /* Market overview */

      const marketSymbols = [
        {
          symbol: "^NSEI",
          name: "NIFTY 50",
        },
        {
          symbol: "^BSESN",
          name: "SENSEX",
        },
        {
          symbol: "^NSEBANK",
          name: "NIFTY BANK",
        },
        {
          symbol: "^CNXIT",
          name: "NIFTY IT",
        },
      ];

      const marketOverview =
        await Promise.all(
          marketSymbols.map(
            async ({
              symbol,
              name,
            }) => {
              try {
                const quote =
                  await yahooFinance.quote(
                    symbol
                  );

                const price =
                  Number(
                    quote.regularMarketPrice
                  ) || null;

                const changePercent =
                  Number(
                    quote.regularMarketChangePercent
                  );

                return {
                  symbol,
                  name,
                  price,
                  changePercent:
                    Number.isFinite(
                      changePercent
                    )
                      ? Number(
                          changePercent.toFixed(
                            2
                          )
                        )
                      : null,
                };
              } catch (error) {
                console.error(
                  `Market overview error for ${symbol}:`,
                  error.message
                );

                return {
                  symbol,
                  name,
                  price: null,
                  changePercent: null,
                };
              }
            }
          )
        );

      /* Watchlist summary */

      let up = 0;
      let down = 0;
      let unchanged = 0;

      let best = null;
      let worst = null;

      const stocks = [];
      const nudges = [];

      for (const stock of watchlist) {
        const ticker =
          stock.ticker;

        try {
          const marketData =
            await getMarketData(
              ticker
            );

          const changePercent =
            Number(
              marketData.changePercent
            ) || 0;

          /* Count movement */

          if (changePercent > 0) {
            up++;
          } else if (
            changePercent < 0
          ) {
            down++;
          } else {
            unchanged++;
          }

          /* Best performer */

          if (
            !best ||
            changePercent >
              best.changePercent
          ) {
            best = {
              ticker,
              changePercent:
                Number(
                  changePercent.toFixed(
                    2
                  )
                ),
            };
          }

          /* Worst performer */

          if (
            !worst ||
            changePercent <
              worst.changePercent
          ) {
            worst = {
              ticker,
              changePercent:
                Number(
                  changePercent.toFixed(
                    2
                  )
                ),
            };
          }

          /* Historical data */

          const snapshots =
            await PriceSnapshot.find({
              ticker,
              source:
                "yahoo-finance-historical",
            })
              .sort({
                capturedAt: -1,
              })
              .limit(31);

          const historicalPrices =
            snapshots
              .slice()
              .reverse()
              .map(
                (snapshot) =>
                  snapshot.price
              );

          const historicalReturns =
            calculateReturns(
              historicalPrices
            );

          const historicalVolumes =
            snapshots
              .map(
                (snapshot) =>
                  snapshot.volume
              )
              .filter(
                (volume) =>
                  volume > 0
              );

          const hasEnoughHistory =
            historicalReturns.length >=
              20 &&
            historicalVolumes.length >=
              20;

          /* Current return */

          const currentReturn =
            marketData.previousClose >
            0
              ? (
                  (
                    marketData.price -
                    marketData.previousClose
                  ) /
                  marketData.previousClose
                ) * 100
              : 0;

          /* Objective signal */

          const signal =
            calculateSignal({
              currentReturn,
              historicalReturns,
              currentVolume:
                marketData.volume ||
                0,
              historicalVolumes,
            });

          /* Previous user view */

          const previousView =
            await UserViewState.findOne(
              {
                userId,
                ticker,
              }
            ).lean();

          let meaningfulSinceLastView =
            false;

          if (
            previousView &&
            previousView.lastSeenPrice >
              0
          ) {
            const priceChange =
              Math.abs(
                (
                  (
                    marketData.price -
                    previousView.lastSeenPrice
                  ) /
                  previousView.lastSeenPrice
                ) * 100
              );

            meaningfulSinceLastView =
              priceChange >= 0.1;
          }

          /* Personalized relevance */

          const personalizedScore =
            calculatePersonalizedScore(
              signal.signalScore,
              interestWeight
            );

          const shouldSurface =
            hasEnoughHistory &&
            Boolean(previousView) &&
            signal.urgency !== "Low" &&
            meaningfulSinceLastView &&
            personalizedScore >=
              PERSONALIZATION_THRESHOLD;

          /* Today's Nudge */

          if (shouldSurface) {
            const marketContext =
              await getMarketContext(
                ticker
              );

            let contextText =
              "Broader market context is unavailable.";

            let suggestion =
              "Take a closer look at this movement.";

            if (marketContext) {
              const stockChange =
                Number(
                  changePercent
                );

              const contextChange =
                Number(
                  marketContext.changePercent
                );

              const relativeDifference =
                stockChange -
                contextChange;

              contextText =
                `${ticker} moved ${
                  stockChange >= 0
                    ? "+"
                    : ""
                }${stockChange.toFixed(
                  2
                )}%, while ${
                  marketContext.name
                } moved ${
                  contextChange >= 0
                    ? "+"
                    : ""
                }${contextChange.toFixed(
                  2
                )}%.`;

              if (
                Math.abs(
                  relativeDifference
                ) >= 1
              ) {
                suggestion =
                  relativeDifference >
                  0
                    ? "The stock is moving noticeably more than its broader market context. It may be worth a closer look."
                    : "The stock is moving noticeably more than its broader market context on the downside. It may be worth a closer look.";
              } else {
                suggestion =
                  "The move is unusual for the stock, even though the broader market is moving in a similar direction.";
              }
            }

            nudges.push({
              ticker,

              price:
                marketData.price,

              changePercent:
                Number(
                  changePercent.toFixed(
                    2
                  )
                ),

              magnitude:
                signal.magnitude ??
                Number(
                  Math.abs(
                    currentReturn
                  ).toFixed(2)
                ),

              zScore:
                signal.zScore,

              volumeRatio:
                signal.volumeRatio,

              urgency:
                signal.urgency,

              personalizedScore,

              reason:
                signal.reason,

              marketContext:
                marketContext
                  ? {
                      name:
                        marketContext.name,

                      changePercent:
                        marketContext.changePercent,
                    }
                  : null,

              contextText,

              suggestion,
            });
          }

          /* Stock result */

          stocks.push({
            ticker,
            price:
              marketData.price,

            changePercent:
              Number(
                changePercent.toFixed(
                  2
                )
              ),

            stale: false,

            hasEnoughHistory,
          });
        } catch (error) {
          console.error(
            `Dashboard stock error for ${ticker}:`,
            error.message
          );

          stocks.push({
            ticker,
            price: null,
            changePercent: null,
            stale: true,
            hasEnoughHistory:
              false,
          });
        }
      }

      /* Sort nudges by relevance */

      nudges.sort(
        (a, b) =>
          b.personalizedScore -
          a.personalizedScore
      );

      /* Response */

      res.json({
        status: "ok",

        marketOverview,

        watchlistSummary: {
          total:
            watchlist.length,
          up,
          down,
          unchanged,
          best,
          worst,
        },

        nudges:
          nudges.slice(0, 5),

        stocks,
      });
    } catch (error) {
      console.error(
        "Dashboard error:",
        error.message
      );

      res.status(500).json({
        status: "error",
        message:
          "Failed to load dashboard.",
      });
    }
  }
);

/* =========================
   Start server
   ========================= */

app.listen(
  PORT,
  () => {
    console.log(
      `Server running on http://localhost:${PORT}`
    );
  }
);