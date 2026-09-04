require("dotenv").config();

const dns = require("dns");

dns.setServers(["8.8.8.8"]);

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const WatchlistItem = require("./models/WatchlistItem");
const PriceSnapshot = require("./models/PriceSnapshot");
const {
  getMarketData,
} = require("./services/marketData");

const {
  calculateSignal,
  calculateReturns,
} = require("./services/signalEngine");

const UserViewState = require("./models/UserViewState");
const SignalEvent = require("./models/SignalEvent");
const UserPreference = require("./models/UserPreference");
const UserFeedback = require("./models/UserFeedback");


/* =========================
   App configuration
   ========================= */

const app = express();

const PORT = process.env.PORT || 5000;

// Minimum personalized score required
// before a meaningful signal is shown.
const PERSONALIZATION_THRESHOLD = 1;


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
    req.headers["x-user-id"] || "demo-user";

  next();
});


/* =========================
   MongoDB connection
   ========================= */

console.log("Trying to connect to MongoDB...");

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

// Get user's watchlist

app.get(
  "/api/watchlist",
  async (req, res) => {
    try {
      const userId = req.userId;

      const watchlist =
        await WatchlistItem.find({
          userId,
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


// Add stock to watchlist

app.post(
  "/api/watchlist",
  async (req, res) => {
    try {
      const userId = req.userId;

      const ticker =
        req.body.ticker
          ?.trim()
          .toUpperCase();

      // Validate ticker

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


      // Verify that the ticker exists

      try {
        await getMarketData(ticker);
      } catch (error) {
        return res.status(400).json({
          message:
            `Stock "${ticker}" was not found.`,
        });
      }


      // Prevent duplicates

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


      // Save stock

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


// Remove stock

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
            date: snapshot.capturedAt,
            price: snapshot.price,
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

      /* -------------------------
         Get current market data
         ------------------------- */

      const marketData =
        await getMarketData(ticker);


      /* -------------------------
         Get historical prices
         ------------------------- */

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
          .reverse()
          .map(
            (snapshot) =>
              snapshot.price
          );


      /* -------------------------
         Calculate historical returns
         ------------------------- */

      const historicalReturns =
        calculateReturns(
          historicalPrices
        );


      /* -------------------------
         Historical volume
         ------------------------- */

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


      /* -------------------------
         Calculate current return
         ------------------------- */

      const currentReturn =
        marketData.previousClose > 0
          ? (
              (
                marketData.price -
                marketData.previousClose
              ) /
              marketData.previousClose
            ) * 100
          : 0;


      /* -------------------------
         Objective signal
         ------------------------- */

      const signal =
        calculateSignal({
          currentReturn,
          historicalReturns,
          currentVolume:
            marketData.volume || 0,
          historicalVolumes,
        });


      /* -------------------------
         Save live snapshot
         ------------------------- */

      await PriceSnapshot.create({
        ticker: marketData.ticker,
        price: marketData.price,
        volume:
          marketData.volume || 0,
        capturedAt: new Date(),
        sourceLagSeconds: null,
        source: "yahoo-finance",
      });


      /* -------------------------
         Return market data
         ------------------------- */

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


      /* -------------------------
         Stale-data fallback
         ------------------------- */

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


      /* -------------------------
         Get current market data
         ------------------------- */

      const marketData =
        await getMarketData(ticker);


      /* -------------------------
         Get historical data
         ------------------------- */

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
          .reverse()
          .map(
            (snapshot) =>
              snapshot.price
          );


      /* -------------------------
         Historical returns
         ------------------------- */

      const historicalReturns =
        calculateReturns(
          historicalPrices
        );


      /* -------------------------
         Historical volumes
         ------------------------- */

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


      /* -------------------------
         Current return
         ------------------------- */

      const currentReturn =
        marketData.previousClose > 0
          ? (
              (
                marketData.price -
                marketData.previousClose
              ) /
              marketData.previousClose
            ) * 100
          : 0;


      /* -------------------------
         Objective signal
         ------------------------- */

      const signal =
        calculateSignal({
          currentReturn,
          historicalReturns,
          currentVolume:
            marketData.volume || 0,
          historicalVolumes,
        });


      /* -------------------------
         Get user preference
         ------------------------- */

      const preference =
        await UserPreference.findOneAndUpdate(
          {
            userId,
          },
          {},
          {
            returnDocument: "after",
            upsert: true,
            setDefaultsOnInsert: true,
          }
        );


      /* -------------------------
         Get previous user view
         ------------------------- */

      const previousView =
        await UserViewState.findOne({
          userId,
          ticker,
        });


      /* -------------------------
         Personalization
         ------------------------- */

      const interestWeight =
        Math.max(
          0,
          Math.min(
            1,
            preference.priceMoveWeight
          )
        );


      const personalizedScore =
        signal.signalScore *
        interestWeight;


      /* -------------------------
         Update latest user view
         ------------------------- */

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
            returnDocument: "after",
            upsert: true,
          }
        );


      /* -------------------------
         Decide whether to surface
         ------------------------- */

      let signalEvent = null;


      const userHasSeenStock =
        Boolean(previousView);


      const objectivelyMeaningful =
        signal.urgency !== "Low";


      let meaningfulSinceLastView =
        false;


      if (previousView) {

        if (
          previousView.lastSeenPrice > 0
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
      }


      const shouldSurfaceSignal =
        userHasSeenStock &&
        objectivelyMeaningful &&
        meaningfulSinceLastView &&
        personalizedScore >=
          PERSONALIZATION_THRESHOLD;


      /* -------------------------
         Create signal event
         ------------------------- */

      if (shouldSurfaceSignal) {

        signalEvent =
          await SignalEvent.create({

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

            shownToUser: true,
          });
      }


      /* -------------------------
         Response
         ------------------------- */

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

      const {
        feedback,
      } = req.body;


      /* -------------------------
         Validate feedback
         ------------------------- */

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


      /* -------------------------
         Find signal
         ------------------------- */

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


      /* -------------------------
         Prevent duplicate feedback
         ------------------------- */

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


      /* -------------------------
         Store feedback
         ------------------------- */

      const savedFeedback =
        await UserFeedback.create({

          userId,

          signalEventId:
            signal._id,

          ticker:
            signal.ticker,

          feedback,
        });


      /* -------------------------
         Get user preference
         ------------------------- */

      const preference =
        await UserPreference.findOneAndUpdate(
          {
            userId,
          },
          {},
          {
            returnDocument: "after",
            upsert: true,
            setDefaultsOnInsert: true,
          }
        );


      /* -------------------------
         Adjust preference
         ------------------------- */

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


      /* -------------------------
         Response
         ------------------------- */

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

app.post("/api/dev/test-signal", async (req, res) => {
  try {
    const userId = req.userId;
    const ticker =
      req.body.ticker?.trim().toUpperCase() || "RELIANCE";

    const signalEvent = await SignalEvent.create({
      userId,
      ticker,
      signalType: "PRICE_MOVE",
      magnitude: 3.25,
      reason:
        "Demo signal: price movement is unusually large and confirmed by elevated volume.",
      shownToUser: true,
    });

    res.status(201).json(signalEvent);
  } catch (error) {
    console.error(
      "Test signal error:",
      error.message
    );

    res.status(500).json({
      message: "Failed to create test signal",
    });
  }
});

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