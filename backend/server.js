require("dotenv").config({
  path: require("path").join(__dirname, "..", ".env"),
});

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const webpush = require("web-push");

const WatchlistItem = require("./models/WatchlistItem");
const PriceSnapshot = require("./models/PriceSnapshot");
const User = require("./models/User");
const Alert = require("./models/Alert");
const PushSubscription = require("./models/PushSubscription");
const UserViewState = require("./models/UserViewState");
const SignalEvent = require("./models/SignalEvent");
const UserPreference = require("./models/UserPreference");
const UserFeedback = require("./models/UserFeedback");
const Activity = require("./models/Activity");

const { getMarketData } = require("./services/marketData");

const {
  calculateSignal,
  calculateReturns,
} = require("./services/signalEngine");

const YahooFinance =
  require("yahoo-finance2").default;

const yahooFinance = new YahooFinance();

const app = express();

const PORT =
  process.env.PORT || 5000;

const JWT_SECRET =
  process.env.JWT_SECRET ||
  "change-this-secret";

const PERSONALIZATION_THRESHOLD = 0.5;

app.use(
  cors({
    origin: true,
  })
);

app.use(express.json());

/* =========================================================
   Market context
   ========================================================= */

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

/* =========================================================
   Web Push
   ========================================================= */

if (
  process.env.VAPID_PUBLIC_KEY &&
  process.env.VAPID_PRIVATE_KEY &&
  process.env.VAPID_EMAIL
) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  console.log("Web Push configured.");
} else {
  console.warn(
    "Web Push keys are missing. Browser notifications are disabled."
  );
}

/* =========================================================
   Helpers
   ========================================================= */

const calculatePersonalizedScore = (
  signalScore,
  interestWeight
) => {
  const score = Math.max(
    0,
    Number(signalScore) || 0
  );

  const weight = Math.max(
    0,
    Math.min(
      1,
      Number(interestWeight) || 0
    )
  );

  return Number(
    (score * weight).toFixed(2)
  );
};

const createToken = (user) => {
  return jwt.sign(
    {
      userId: user._id.toString(),
      email: user.email,
    },
    JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
};

const getUserIdFromToken = (req) => {
  const authorization =
    req.headers.authorization || "";

  if (
    !authorization.startsWith(
      "Bearer "
    )
  ) {
    return null;
  }

  const token =
    authorization.substring(7);

  try {
    const decoded =
      jwt.verify(
        token,
        JWT_SECRET
      );

    return decoded.userId;
  } catch {
    return null;
  }
};

const optionalAuth = (
  req,
  res,
  next
) => {
  const userId =
    getUserIdFromToken(req);

  req.userId = userId;

  req.isAuthenticated =
    Boolean(userId);

  next();
};

const requireAuth = (
  req,
  res,
  next
) => {
  const userId =
    getUserIdFromToken(req);

  if (!userId) {
    return res.status(401).json({
      message:
        "Please log in to continue.",
    });
  }

  req.userId = userId;
  req.isAuthenticated = true;

  next();
};

const normalizeEmail = (
  email
) => {
  return String(email || "")
    .trim()
    .toLowerCase();
};

const isValidEmail = (
  email
) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email
  );
};

const isValidPassword = (
  password
) => {
  return (
    typeof password === "string" &&
    password.length >= 8
  );
};

/* =========================================================
   Activity
   ========================================================= */

const createActivity = async ({
  userId,
  type,
  ticker = null,
  message,
}) => {
  if (!userId) {
    return;
  }

  try {
    await Activity.create({
      userId,
      type,
      ticker,
      message,
    });
  } catch (error) {
    console.error(
      "Activity error:",
      error.message
    );
  }
};

/* =========================================================
   Market context
   ========================================================= */

const getMarketContext = async (
  ticker
) => {
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
      changePercent:
        Number.isFinite(
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

/* =========================================================
   Push notification
   ========================================================= */

const sendPushNotification = async (
  userId,
  title,
  message
) => {
  if (
    !process.env.VAPID_PUBLIC_KEY ||
    !process.env.VAPID_PRIVATE_KEY ||
    !process.env.VAPID_EMAIL
  ) {
    return;
  }

  const subscriptions =
    await PushSubscription.find({
      userId,
    });

  const payload =
    JSON.stringify({
      title,
      body: message,
      icon: "/nudge-icon.png",
      badge: "/nudge-icon.png",
    });

  for (
    const subscription of subscriptions
  ) {
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
        error.statusCode,
        error.message
      );

      if (
        error.statusCode === 404 ||
        error.statusCode === 410
      ) {
        await PushSubscription.deleteOne({
          _id: subscription._id,
        });
      }
    }
  }
};

/* =========================================================
   Alert checker
   ========================================================= */

const checkAlerts = async (
  ticker,
  price,
  userId = null
) => {
  if (
    !userId ||
    !Number.isFinite(
      Number(price)
    )
  ) {
    return;
  }

  const alerts =
    await Alert.find({
      ticker,
      userId,
      active: true,
    });

  for (const alert of alerts) {
    const target =
      Number(alert.targetPrice);

    let triggered = false;

    if (
      alert.condition === "below" &&
      price <= target
    ) {
      triggered = true;
    }

    if (
      alert.condition === "above" &&
      price >= target
    ) {
      triggered = true;
    }

    if (!triggered) {
      continue;
    }

    alert.active = false;
    alert.triggeredAt = new Date();

    await alert.save();

    await createActivity({
      userId: alert.userId,
      type: "alert_triggered",
      ticker: alert.ticker,
      message:
        `${alert.ticker} alert triggered at ₹${Number(
          price
        ).toLocaleString("en-IN", {
          maximumFractionDigits: 2,
        })}.`,
    });

    await sendPushNotification(
      alert.userId.toString(),
      `${ticker} price alert`,
      `${ticker} crossed ${
        alert.condition === "below"
          ? "below"
          : "above"
      } ₹${target.toLocaleString(
        "en-IN"
      )}. Current price: ₹${price.toLocaleString(
        "en-IN",
        {
          maximumFractionDigits: 2,
        }
      )}.`
    );
  }
};

/* =========================================================
   Safe market data
   ========================================================= */

const getSafeMarketData = async (
  ticker,
  userId = null
) => {
  try {
    const marketData =
      await getMarketData(ticker);

    await checkAlerts(
      ticker,
      marketData.price,
      userId
    );

    return {
      ...marketData,
      stale: false,
      unavailable: false,
    };
  } catch (error) {
    console.error(
      `Live data unavailable for ${ticker}:`,
      error.message
    );

    const latestSnapshot =
      await PriceSnapshot.findOne({
        ticker,
      }).sort({
        capturedAt: -1,
      });

    if (!latestSnapshot) {
      return {
        ticker,
        price: null,
        volume: null,
        changePercent: null,
        previousClose: null,
        stale: true,
        unavailable: true,
      };
    }

    return {
      ticker,
      price:
        latestSnapshot.price,

      volume:
        latestSnapshot.volume,

      changePercent:
        null,

      previousClose:
        latestSnapshot.previousClose ??
        null,

      capturedAt:
        latestSnapshot.capturedAt,

      source:
        latestSnapshot.source,

      stale: true,
      unavailable: false,
    };
  }
};

/* =========================================================
   Authentication
   ========================================================= */

app.post(
  "/api/auth/register",
  async (req, res) => {
    try {
      const email =
        normalizeEmail(
          req.body.email
        );

      const password =
        req.body.password;

      if (!isValidEmail(email)) {
        return res.status(400).json({
          message:
            "Please enter a valid email address.",
        });
      }

      if (!isValidPassword(password)) {
        return res.status(400).json({
          message:
            "Password must contain at least 8 characters.",
        });
      }

      const existingUser =
        await User.findOne({
          email,
        });

      if (existingUser) {
        return res.status(409).json({
          message:
            "An account with this email already exists.",
        });
      }

      const passwordHash =
        await bcrypt.hash(
          password,
          12
        );

      const user =
        await User.create({
          email,
          passwordHash,
        });

      const token =
        createToken(user);

      return res.status(201).json({
        token,
        user: {
          id: user._id,
          email: user.email,
        },
      });
    } catch (error) {
      console.error(
        "Registration error:",
        error.message
      );

      return res.status(500).json({
        message:
          "Could not create your account.",
      });
    }
  }
);

app.post(
  "/api/auth/login",
  async (req, res) => {
    try {
      const email =
        normalizeEmail(
          req.body.email
        );

      const password =
        req.body.password;

      const user =
        await User.findOne({
          email,
        });

      if (!user) {
        return res.status(401).json({
          message:
            "Incorrect email or password.",
        });
      }

      const passwordMatches =
        await bcrypt.compare(
          password,
          user.passwordHash
        );

      if (!passwordMatches) {
        return res.status(401).json({
          message:
            "Incorrect email or password.",
        });
      }

      const token =
        createToken(user);

      await createActivity({
        userId: user._id,
        type: "login",
        message:
          "Logged in to Nudge.",
      });

      return res.json({
        token,
        user: {
          id: user._id,
          email: user.email,
        },
      });
    } catch (error) {
      console.error(
        "Login error:",
        error.message
      );

      return res.status(500).json({
        message:
          "Could not log you in.",
      });
    }
  }
);

app.get(
  "/api/auth/me",
  requireAuth,
  async (req, res) => {
    try {
      const user =
        await User.findById(
          req.userId
        ).select(
          "_id email createdAt"
        );

      if (!user) {
        return res.status(404).json({
          message:
            "User account not found.",
        });
      }

      return res.json({
        user: {
          id: user._id,
          email: user.email,
          createdAt:
            user.createdAt,
        },
      });
    } catch (error) {
      console.error(
        "Auth check error:",
        error.message
      );

      return res.status(500).json({
        message:
          "Could not verify your session.",
      });
    }
  }
);

/* =========================================================
   Guest migration
   ========================================================= */

app.post(
  "/api/auth/migrate-guest",
  requireAuth,
  async (req, res) => {
    try {
      const guestId =
        String(
          req.body.guestId || ""
        ).trim();

      if (!guestId) {
        return res.json({
          migrated: 0,
        });
      }

      const guestItems =
        await WatchlistItem.find({
          userId: guestId,
        });

      let migrated = 0;

      for (
        const item of guestItems
      ) {
        const exists =
          await WatchlistItem.findOne({
            userId:
              req.userId,
            ticker:
              item.ticker,
          });

        if (!exists) {
          await WatchlistItem.create({
            userId:
              req.userId,
            ticker:
              item.ticker,
          });

          migrated++;
        }
      }

      await WatchlistItem.deleteMany({
        userId: guestId,
      });

      return res.json({
        migrated,
      });
    } catch (error) {
      console.error(
        "Guest migration error:",
        error.message
      );

      return res.status(500).json({
        message:
          "Could not save your guest watchlist.",
      });
    }
  }
);

/* =========================================================
   Watchlist
   ========================================================= */

app.get(
  "/api/watchlist",
  optionalAuth,
  async (req, res) => {
    try {
      const userId =
        req.userId ||
        req.headers["x-guest-id"] ||
        "demo-user";

      const watchlist =
        await WatchlistItem.find({
          userId,
        }).sort({
          createdAt: 1,
        });

      return res.json(
        watchlist
      );
    } catch (error) {
      console.error(
        "Fetch watchlist error:",
        error.message
      );

      return res.status(500).json({
        message:
          "Failed to fetch watchlist.",
      });
    }
  }
);

app.post(
  "/api/watchlist",
  optionalAuth,
  async (req, res) => {
    try {
      const ticker =
        String(
          req.body.ticker || ""
        )
          .trim()
          .toUpperCase();

      const userId =
        req.userId ||
        req.headers["x-guest-id"] ||
        "demo-user";

      if (
        !/^[A-Z0-9.-]{1,15}$/.test(
          ticker
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid ticker symbol.",
        });
      }

      const existing =
        await WatchlistItem.findOne({
          userId,
          ticker,
        });

      if (existing) {
        return res.status(409).json({
          message:
            "Stock is already in your watchlist.",
        });
      }

      const item =
        await WatchlistItem.create({
          userId,
          ticker,
        });

      if (req.isAuthenticated) {
        await createActivity({
          userId,
          type:
            "watchlist_added",
          ticker,
          message:
            `${ticker} added to your watchlist.`,
        });
      }

      let historyReady = false;

      try {
        const {
          loadHistoricalDataForTicker,
        } =
          require(
            "./jobs/marketIngestion"
          );

        const historyResult =
          await loadHistoricalDataForTicker(
            ticker
          );

        historyReady = Boolean(
          historyResult?.success &&
          historyResult.count >= 20
        );
      } catch (historyError) {
        console.error(
          `Could not initialize history for ${ticker}:`,
          historyError.message
        );
      }

      return res.status(201).json({
        ...item.toObject(),
        historyReady,
      });
    } catch (error) {
      console.error(
        "Add watchlist error:",
        error.message
      );

      return res.status(500).json({
        message:
          "Could not add stock.",
      });
    }
  }
);

app.delete(
  "/api/watchlist/:id",
  optionalAuth,
  async (req, res) => {
    try {
      const userId =
        req.userId ||
        req.headers["x-guest-id"] ||
        "demo-user";

      const deletedStock =
        await WatchlistItem.findOneAndDelete({
          _id: req.params.id,
          userId,
        });

      if (!deletedStock) {
        return res.status(404).json({
          message:
            "Stock not found.",
        });
      }

      if (req.isAuthenticated) {
        await createActivity({
          userId,
          type:
            "watchlist_removed",
          ticker:
            deletedStock.ticker,
          message:
            `${deletedStock.ticker} removed from your watchlist.`,
        });
      }

      return res.json({
        message:
          "Stock removed successfully.",
      });
    } catch (error) {
      console.error(
        "Remove stock error:",
        error.message
      );

      return res.status(500).json({
        message:
          "Failed to remove stock.",
      });
    }
  }
);

/* =========================================================
   Price history
   ========================================================= */

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
          .limit(35);

      const history =
        snapshots.map(
          (snapshot) => ({
            date:
              snapshot.capturedAt,
            price:
              snapshot.price,
          })
        );

      return res.json(
        history
      );
    } catch (error) {
      console.error(
        "Price history error:",
        error.message
      );

      return res.status(500).json({
        message:
          "Could not fetch price history.",
      });
    }
  }
);

/* =========================================================
   Historical helper
   ========================================================= */

const getHistoricalSnapshots =
  async (ticker) => {
    return PriceSnapshot.find({
      ticker,
      source:
        "yahoo-finance-historical",
    })
      .sort({
        capturedAt: -1,
      })
      .limit(31);
  };

/* =========================================================
   Market data
   ========================================================= */

app.get(
  "/api/market/:ticker",
  async (req, res) => {
    const ticker =
      req.params.ticker
        .trim()
        .toUpperCase();

    try {
      const marketData =
        await getMarketData(
          ticker
        );

      await checkAlerts(
        ticker,
        marketData.price
      );

      const snapshots =
        await getHistoricalSnapshots(
          ticker
        );

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

      const signal =
        calculateSignal({
          currentReturn,
          historicalReturns,
          currentVolume:
            marketData.volume || 0,
          historicalVolumes,
        });

      await PriceSnapshot.create({
        ticker:
          marketData.ticker,

        price:
          marketData.price,

        previousClose:
          marketData.previousClose ??
          null,

        volume:
          marketData.volume || 0,

        capturedAt:
          new Date(),

        sourceLagSeconds:
          null,

        source:
          "yahoo-finance",
      });

      return res.json({
        ...marketData,
        ...signal,
        stale: false,
        unavailable: false,
        hasEnoughHistory:
          historicalReturns.length >=
            20 &&
          historicalVolumes.length >=
            20,
      });
    } catch (error) {
      console.error(
        `Market data error for ${ticker}:`,
        error.message
      );

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
          ticker,
          stale: true,
          unavailable: true,
        });
      }

      return res.json({
        ticker,
        price:
          latestSnapshot.price,
        previousClose:
          latestSnapshot.previousClose ??
          null,
        volume:
          latestSnapshot.volume,
        capturedAt:
          latestSnapshot.capturedAt,
        source:
          latestSnapshot.source,
        stale: true,
        unavailable: false,
        urgency: "Low",
        signalScore: 0,
        reason:
          "Live market data is temporarily unavailable. Showing the last available snapshot.",
      });
    }
  }
);

/* =========================================================
   Market view + personalization
   ========================================================= */

app.post(
  "/api/market/:ticker/view",
  requireAuth,
  async (req, res) => {
    try {
      const ticker =
        req.params.ticker
          .trim()
          .toUpperCase();

      const userId =
        req.userId;

      const marketData =
        await getMarketData(
          ticker
        );

      await checkAlerts(
        ticker,
        marketData.price,
        req.userId
      );

      const snapshots =
        await getHistoricalSnapshots(
          ticker
        );

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

      const signal =
        calculateSignal({
          currentReturn,
          historicalReturns,
          currentVolume:
            marketData.volume || 0,
          historicalVolumes,
        });

      const preference =
        await UserPreference.findOneAndUpdate(
          {
            userId,
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

      const previousView =
        await UserViewState.findOne({
          userId,
          ticker,
        });

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

      /*
       * Same fix as /api/dashboard: don't require a prior
       * view before a signal can ever be recorded. The first
       * check of a stock should still surface (and log to
       * signal history) a genuinely meaningful move.
       */
      const shouldSurfaceSignal =
        hasEnoughHistory &&
        signal.urgency !== "Low" &&
        (!previousView ||
          meaningfulSinceLastView) &&
        personalizedScore >=
          PERSONALIZATION_THRESHOLD;

      let signalEvent = null;

      if (
        shouldSurfaceSignal
      ) {
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

        await createActivity({
          userId,
          type:
            "signal_shown",
          ticker,
          message:
            `${ticker}: ${signal.reason}`,
        });
      }

      await createActivity({
        userId,
        type:
          "market_checked",
        ticker,
        message:
          `Checked ${ticker} market data.`,
      });

      return res.json({
        viewState,
        signalEvent,
        hasEnoughHistory,
        personalizedScore,
      });
    } catch (error) {
      /*
       * Log the full error (including the underlying
       * cause, which fetch() hides behind a generic
       * "fetch failed" message) so real network/API
       * problems are visible in the server logs.
       */
      console.error(
        "View state error:",
        error.message,
        error.cause || ""
      );

      /*
       * Don't hard-fail just because live market data
       * (e.g. Yahoo Finance) is temporarily unreachable.
       * Degrade gracefully instead of throwing a 500.
       */
      return res.status(200).json({
        viewState: null,
        signalEvent: null,
        hasEnoughHistory: false,
        personalizedScore: 0,
        stale: true,
        message:
          "Live market data is temporarily unavailable, so this check could not be personalized.",
      });
    }
  }
);

/* =========================================================
   Signal history
   ========================================================= */

app.get(
  "/api/signals/:ticker/history",
  requireAuth,
  async (req, res) => {
    try {
      const ticker =
        req.params.ticker
          .trim()
          .toUpperCase();

      const signals =
        await SignalEvent.find({
          ticker,
          userId:
            req.userId,
        })
          .sort({
            createdAt: -1,
          })
          .limit(20);

      return res.json(
        signals
      );
    } catch (error) {
      console.error(
        "Signal history error:",
        error.message
      );

      return res.status(500).json({
        message:
          "Failed to fetch signal history.",
      });
    }
  }
);

/* =========================================================
   Feedback
   ========================================================= */

app.post(
  "/api/signals/:signalId/feedback",
  requireAuth,
  async (req, res) => {
    try {
      const feedback =
        req.body.feedback;

      if (
        ![
          "useful",
          "not_for_me",
        ].includes(
          feedback
        )
      ) {
        return res.status(400).json({
          message:
            "Feedback must be 'useful' or 'not_for_me'.",
        });
      }

      const signal =
        await SignalEvent.findOne({
          _id:
            req.params.signalId,
          userId:
            req.userId,
        });

      if (!signal) {
        return res.status(404).json({
          message:
            "Signal not found.",
        });
      }

      const existingFeedback =
        await UserFeedback.findOne({
          userId:
            req.userId,

          signalEventId:
            signal._id,
        });

      if (existingFeedback) {
        return res.status(409).json({
          message:
            "Feedback already recorded for this signal.",
        });
      }

      const savedFeedback =
        await UserFeedback.create({
          userId:
            req.userId,

          signalEventId:
            signal._id,

          ticker:
            signal.ticker,

          feedback,
        });

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

      await createActivity({
        userId:
          req.userId,

        type:
          "feedback_given",

        ticker:
          signal.ticker,

        message:
          `Marked ${signal.ticker} signal as ${
            feedback === "useful"
              ? "useful"
              : "not for me"
          }.`,
      });

      return res.json({
        message:
          "Feedback recorded.",

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

      return res.status(500).json({
        message:
          "Failed to record feedback.",
      });
    }
  }
);

/* =========================================================
   Push subscription
   ========================================================= */

app.get(
  "/api/push/public-key",
  requireAuth,
  (req, res) => {
    if (
      !process.env.VAPID_PUBLIC_KEY
    ) {
      return res.status(503).json({
        message:
          "Browser notifications are not configured yet.",
      });
    }

    return res.json({
      publicKey:
        process.env.VAPID_PUBLIC_KEY,
    });
  }
);

app.post(
  "/api/push/subscribe",
  requireAuth,
  async (req, res) => {
    try {
      const subscription =
        req.body;

      if (
        !subscription ||
        !subscription.endpoint ||
        !subscription.keys
      ) {
        return res.status(400).json({
          message:
            "Invalid push subscription.",
        });
      }

      await PushSubscription.findOneAndUpdate(
        {
          userId:
            req.userId,

          endpoint:
            subscription.endpoint,
        },
        {
          userId:
            req.userId,

          endpoint:
            subscription.endpoint,

          keys: {
            p256dh:
              subscription.keys.p256dh,

            auth:
              subscription.keys.auth,
          },
        },
        {
          upsert: true,
          returnDocument:
            "after",
        }
      );

      return res.json({
        message:
          "Browser notifications enabled.",
      });
    } catch (error) {
      console.error(
        "Push subscription error:",
        error.message
      );

      return res.status(500).json({
        message:
          "Could not enable browser notifications.",
      });
    }
  }
);

app.delete(
  "/api/push/subscribe",
  requireAuth,
  async (req, res) => {
    try {
      const endpoint =
        String(
          req.body.endpoint || ""
        ).trim();

      if (endpoint) {
        await PushSubscription.deleteOne({
          userId:
            req.userId,

          endpoint,
        });
      }

      return res.json({
        message:
          "Browser notifications disabled.",
      });
    } catch (error) {
      console.error(
        "Push unsubscribe error:",
        error.message
      );

      return res.status(500).json({
        message:
          "Could not disable browser notifications.",
      });
    }
  }
);

/* =========================================================
   Alerts
   ========================================================= */

app.get(
  "/api/alerts",
  requireAuth,
  async (req, res) => {
    try {
      const alerts =
        await Alert.find({
          userId:
            req.userId,
        })
          .sort({
            createdAt: -1,
          })
          .lean();

      return res.json(
        alerts
      );
    } catch (error) {
      console.error(
        "Fetch alerts error:",
        error.message
      );

      return res.status(500).json({
        message:
          "Could not fetch alerts.",
      });
    }
  }
);

app.post(
  "/api/alerts",
  requireAuth,
  async (req, res) => {
    try {
      const ticker =
        String(
          req.body.ticker || ""
        )
          .trim()
          .toUpperCase();

      const condition =
        String(
          req.body.condition || ""
        ).trim();

      const targetPrice =
        Number(
          req.body.targetPrice
        );

      if (
        !/^[A-Z0-9.-]{1,15}$/.test(
          ticker
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid ticker symbol.",
        });
      }

      if (
        ![
          "above",
          "below",
        ].includes(condition)
      ) {
        return res.status(400).json({
          message:
            "Alert condition must be above or below.",
        });
      }

      if (
        !Number.isFinite(
          targetPrice
        ) ||
        targetPrice <= 0
      ) {
        return res.status(400).json({
          message:
            "Please enter a valid target price.",
        });
      }

      const alert =
        await Alert.create({
          userId:
            req.userId,

          ticker,

          condition,

          targetPrice,

          active: true,
        });

      await createActivity({
        userId:
          req.userId,

        type:
          "alert_created",

        ticker,

        message:
          `Created a ${condition} ₹${targetPrice} alert for ${ticker}.`,
      });

      return res
        .status(201)
        .json(alert);
    } catch (error) {
      console.error(
        "Create alert error:",
        error.message
      );

      return res.status(500).json({
        message:
          "Could not create price alert.",
      });
    }
  }
);

app.delete(
  "/api/alerts/:id",
  requireAuth,
  async (req, res) => {
    try {
      const deletedAlert =
        await Alert.findOneAndDelete({
          _id:
            req.params.id,

          userId:
            req.userId,
        });

      if (!deletedAlert) {
        return res.status(404).json({
          message:
            "Alert not found.",
        });
      }

      await createActivity({
        userId:
          req.userId,

        type:
          "alert_removed",

        ticker:
          deletedAlert.ticker,

        message:
          `Removed the ${deletedAlert.ticker} price alert.`,
      });

      return res.json({
        message:
          "Alert removed.",
      });
    } catch (error) {
      console.error(
        "Delete alert error:",
        error.message
      );

      return res.status(500).json({
        message:
          "Could not remove alert.",
      });
    }
  }
);

app.patch(
  "/api/alerts/:id/toggle",
  requireAuth,
  async (req, res) => {
    try {
      const alert =
        await Alert.findOne({
          _id:
            req.params.id,

          userId:
            req.userId,
        });

      if (!alert) {
        return res.status(404).json({
          message:
            "Alert not found.",
        });
      }

      alert.active =
        !alert.active;

      if (alert.active) {
        alert.triggeredAt =
          null;
      }

      await alert.save();

      return res.json(
        alert
      );
    } catch (error) {
      console.error(
        "Toggle alert error:",
        error.message
      );

      return res.status(500).json({
        message:
          "Could not update alert.",
      });
    }
  }
);

/* =========================================================
   Activity
   ========================================================= */

app.get(
  "/api/activity",
  requireAuth,
  async (req, res) => {
    try {
      const activity =
        await Activity.find({
          userId:
            req.userId,
        })
          .sort({
            createdAt: -1,
          })
          .limit(10)
          .lean();

      return res.json(
        activity
      );
    } catch (error) {
      console.error(
        "Activity fetch error:",
        error.message
      );

      return res.status(500).json({
        message:
          "Could not fetch activity.",
      });
    }
  }
);

/* =========================================================
   Dashboard
   ========================================================= */

app.get(
  "/api/dashboard",
  optionalAuth,
  async (req, res) => {
    try {
      const userId =
        req.userId ||
        req.headers["x-guest-id"] ||
        "demo-user";

      let interestWeight =
        0.5;

      if (
        req.isAuthenticated
      ) {
        const preference =
          await UserPreference.findOneAndUpdate(
            {
              userId,
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

        interestWeight =
          Math.max(
            0,
            Math.min(
              1,
              Number(
                preference.priceMoveWeight
              ) || 0.5
            )
          );
      }

      const watchlist =
        await WatchlistItem.find({
          userId,
        }).lean();

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
                  );

                const changePercent =
                  Number(
                    quote.regularMarketChangePercent
                  );

                return {
                  symbol,
                  name,

                  price:
                    Number.isFinite(
                      price
                    )
                      ? price
                      : null,

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

                  stale:
                    false,
                };
              } catch (error) {
                console.error(
                  `Market overview error for ${symbol}:`,
                  error.message
                );

                const cached =
                  await PriceSnapshot.findOne(
                    {
                      ticker:
                        symbol,
                    }
                  ).sort({
                    capturedAt: -1,
                  });

                return {
                  symbol,
                  name,

                  price:
                    cached?.price ??
                    null,

                  changePercent:
                    cached?.previousClose &&
                    cached.price != null
                      ? Number(
                          (
                            (
                              (
                                cached.price -
                                cached.previousClose
                              ) /
                              cached.previousClose
                            ) *
                            100
                          ).toFixed(2)
                        )
                      : null,

                  stale:
                    true,
                };
              }
            }
          )
        );

      let up = 0;
      let down = 0;
      let unchanged = 0;

      let best = null;
      let worst = null;

      const stocks = [];
      const nudges = [];

      for (
        const stock of watchlist
      ) {
        const ticker =
          stock.ticker;

        try {
          const marketData =
            await getSafeMarketData(
              ticker,
              req.isAuthenticated
                ? userId
                : null
            );

          const hasLivePrice =
            Number.isFinite(
              Number(
                marketData.price
              )
            );

          const hasLiveChange =
            Number.isFinite(
              Number(
                marketData.changePercent
              )
            );

          const stale =
            Boolean(
              marketData.stale
            );

          const unavailable =
            Boolean(
              marketData.unavailable
            );

          const changePercent =
            hasLiveChange
              ? Number(
                  marketData.changePercent
                )
              : null;

          if (
            changePercent !==
            null
          ) {
            if (
              changePercent >
              0
            ) {
              up++;
            } else if (
              changePercent <
              0
            ) {
              down++;
            } else {
              unchanged++;
            }

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
          }

          const snapshots =
            await getHistoricalSnapshots(
              ticker
            );

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

          let signal = {
            signalScore: 0,

            urgency:
              "Low",

            reason:
              "Not enough history yet to determine a meaningful change.",

            zScore: 0,

            volumeRatio: 0,
          };

          if (
            hasEnoughHistory &&
            hasLivePrice &&
            marketData.previousClose >
              0
          ) {
            const currentReturn =
              (
                (
                  marketData.price -
                  marketData.previousClose
                ) /
                marketData.previousClose
              ) * 100;

            signal =
              calculateSignal({
                currentReturn,

                historicalReturns,

                currentVolume:
                  marketData.volume ||
                  0,

                historicalVolumes,
              });
          }

          let previousView =
            null;

          if (
            req.isAuthenticated
          ) {
            previousView =
              await UserViewState.findOne(
                {
                  userId,
                  ticker,
                }
              ).lean();
          }

          let meaningfulSinceLastView =
            false;

          if (
            previousView &&
            previousView.lastSeenPrice >
              0 &&
            hasLivePrice
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
              priceChange >=
              0.1;
          }

          const personalizedScore =
            calculatePersonalizedScore(
              signal.signalScore,
              interestWeight
            );

          /*
           * A signal can surface either the FIRST time we
           * ever check a stock (nothing to compare against
           * yet, so we trust the signal engine's own
           * "is this unusual?" judgment), OR on a later
           * check if something has meaningfully changed
           * since the last time the user looked. Previously
           * this required BOTH a prior view AND a fresh move
           * since that view, which meant a nudge could never
           * appear on the very first check of any stock.
           */

          const shouldSurface =
            req.isAuthenticated &&
            !stale &&
            !unavailable &&
            hasEnoughHistory &&
            signal.urgency !== "Low" &&
            personalizedScore >=
              PERSONALIZATION_THRESHOLD;

          if (shouldSurface) {
            const marketContext =
              await getMarketContext(ticker);

            const stockChange =
              Number(changePercent);

            const contextChange =
              Number(
                marketContext?.changePercent ?? 0
              );

            const relativeDifference =
              stockChange - contextChange;

            const contextText =
              marketContext
                ? `${ticker} moved ${
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
                  )}%.`
                : "Broader market context is unavailable.";

            let suggestion;

            if (
              Math.abs(
                relativeDifference
              ) >= 1
            ) {
              suggestion =
                relativeDifference > 0
                  ? "The stock is moving noticeably more than its broader market context. It may be worth a closer look."
                  : "The stock is moving noticeably more than its broader market context on the downside. It may be worth a closer look.";
            } else {
              suggestion =
                "The move is unusual for the stock, even though the broader market is moving in a similar direction.";
            }

            nudges.push({
              ticker,

              price:
                marketData.price,

              changePercent:
                Number(
                  changePercent.toFixed(2)
                ),

              magnitude:
                marketData.previousClose > 0
                  ? Number(
                      Math.abs(
                        (
                          (
                            marketData.price -
                            marketData.previousClose
                          ) /
                          marketData.previousClose
                        ) * 100
                      ).toFixed(2)
                    )
                  : 0,

              zScore:
                signal.zScore,

              volumeRatio:
                signal.volumeRatio,

              urgency:
                signal.urgency,

              personalizedScore,

              reason:
                signal.reason,

              contextText,

              suggestion,
            });
          }

          stocks.push({
            ticker,

            price:
              hasLivePrice
                ? marketData.price
                : null,

            changePercent,

            stale,

            unavailable,

            hasEnoughHistory,
          });
        } catch (error) {
          console.error(
            `Dashboard stock error for ${ticker}:`,
            error.message
          );

          const latestSnapshot =
            await PriceSnapshot.findOne({
              ticker,
            }).sort({
              capturedAt: -1,
            });

          stocks.push({
            ticker,

            price:
              latestSnapshot?.price ??
              null,

            changePercent:
              null,

            stale:
              true,

            unavailable:
              !latestSnapshot,

            hasEnoughHistory:
              false,
          });
        }
      }

      nudges.sort(
        (a, b) =>
          b.personalizedScore -
          a.personalizedScore
      );

      return res.json({
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

      return res.status(500).json({
        status: "error",

        message:
          "Failed to load dashboard.",
      });
    }
  }
);
/* =========================================================
   Health check
   ========================================================= */

app.get(
  "/",
  (req, res) => {
    res.json({
      message:
        "Nudge backend is running.",

      database:
        "MongoDB",
    });
  }
);

/* =========================================================
   MongoDB
   ========================================================= */

console.log(
  "Trying to connect to MongoDB..."
);

mongoose
  .connect(
    process.env.MONGO_URI,
    {
      serverSelectionTimeoutMS:
        10000,
    }
  )
  .then(
    async () => {
      console.log(
        "MongoDB connected successfully!"
      );

      const {
        runMarketIngestion,
        bootstrapHistoricalData,
      } =
        require(
          "./jobs/marketIngestion"
        );

      await bootstrapHistoricalData();

      runMarketIngestion();
    }
  )
  .catch(
    (error) => {
      console.error(
        "MongoDB connection failed:",
        error.message
      );
    }
  );

/* =========================================================
   Start server
   ========================================================= */

app.listen(
  PORT,
  () => {
    console.log(
      `Server running on http://localhost:${PORT}`
    );
  }
);