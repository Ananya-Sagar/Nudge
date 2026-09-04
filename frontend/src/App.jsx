import {
  useCallback,
  useEffect,
  useState,
} from "react";

import "./App.css";

/* =========================================================
   Configuration
   ========================================================= */

const API_URL =
  import.meta.env.DEV
    ? "http://localhost:5000"
    : "https://nudge-obc3.onrender.com";

const TOKEN_KEY =
  "nudge_auth_token";

const GUEST_ID_KEY =
  "nudge_guest_id";

const GUEST_MODE_KEY =
  "nudge_guest_mode";

const GUEST_USED_KEY =
  "nudge_guest_used";

/* =========================================================
   Company names
   ========================================================= */

const COMPANY_NAMES = {
  RELIANCE: "Reliance Industries",
  TCS: "Tata Consultancy Services",
  INFY: "Infosys",
  HDFCBANK: "HDFC Bank",
  ICICIBANK: "ICICI Bank",
  SBIN: "State Bank of India",
  ITC: "ITC",
  LT: "Larsen & Toubro",
  WIPRO: "Wipro",
  AXISBANK: "Axis Bank",
};

/* =========================================================
   Storage helpers
   ========================================================= */

const getGuestId = () => {
  let guestId =
    localStorage.getItem(
      GUEST_ID_KEY
    );

  if (!guestId) {
    guestId = crypto.randomUUID();

    localStorage.setItem(
      GUEST_ID_KEY,
      guestId
    );
  }

  return guestId;
};

const getToken = () => {
  return localStorage.getItem(
    TOKEN_KEY
  );
};

const getRequestHeaders = (
  includeJson = false
) => {
  const headers = {};

  if (includeJson) {
    headers["Content-Type"] =
      "application/json";
  }

  const token = getToken();

  if (token) {
    headers.Authorization =
      `Bearer ${token}`;
  } else {
    headers["X-Guest-Id"] =
      getGuestId();
  }

  return headers;
};

/* =========================================================
   Push helpers
   ========================================================= */

const urlBase64ToUint8Array = (
  value
) => {
  const padding =
    "=".repeat(
      (4 -
        (value.length % 4)) %
        4
    );

  const base64 =
    (
      value + padding
    )
      .replace(/-/g, "+")
      .replace(/_/g, "/");

  const rawData =
    window.atob(base64);

  return Uint8Array.from(
    [...rawData].map(
      (character) =>
        character.charCodeAt(0)
    )
  );
};

/* =========================================================
   Price Chart
   ========================================================= */

function PriceChart({ data }) {
  const [
    hoveredPoint,
    setHoveredPoint,
  ] = useState(null);

  if (
    !data ||
    data.length < 2
  ) {
    return (
      <div className="chart-placeholder">
        Not enough price history yet.
      </div>
    );
  }

  const width = 620;
  const height = 150;

  const paddingLeft = 42;
  const paddingRight = 12;
  const paddingTop = 10;
  const paddingBottom = 24;

  const prices = data.map(
    (point) =>
      Number(point.price)
  );

  const minPrice =
    Math.min(...prices);

  const maxPrice =
    Math.max(...prices);

  const priceRange =
    maxPrice - minPrice || 1;

  const firstPrice = prices[0];
  const lastPrice =
    prices[prices.length - 1];

  const overallChange =
    firstPrice > 0
      ? ((lastPrice -
          firstPrice) /
          firstPrice) *
        100
      : 0;

  const chartColor =
    overallChange >= 0
      ? "#2f8f5b"
      : "#c94f4f";

  const gradientId =
    overallChange >= 0
      ? "chartGradientGreen"
      : "chartGradientRed";

  const getX = (index) =>
    paddingLeft +
    (index /
      (data.length - 1)) *
      (width -
        paddingLeft -
        paddingRight);

  const getY = (price) =>
    paddingTop +
    (1 -
      (price -
        minPrice) /
        priceRange) *
      (height -
        paddingTop -
        paddingBottom);

  const points = data
    .map(
      (point, index) =>
        `${getX(index)},${getY(
          Number(point.price)
        )}`
    )
    .join(" ");

  const areaPoints = [
    `${getX(0)},${
      height - paddingBottom
    }`,
    points,
    `${getX(
      data.length - 1
    )},${
      height - paddingBottom
    }`,
  ].join(" ");

  const latestIndex =
    data.length - 1;

  const latestPoint =
    data[latestIndex];

  const latestX =
    getX(latestIndex);

  const latestY =
    getY(
      Number(latestPoint.price)
    );

  const yLabels = [
    maxPrice,
    minPrice +
      priceRange / 2,
    minPrice,
  ];

  const dateIndexes = [
    0,
    Math.floor(
      (data.length - 1) / 2
    ),
    data.length - 1,
  ];

  return (
    <div className="chart-container">
      <div className="chart-header">
        <span className="chart-label">
          Price movement
        </span>

        <div className="chart-header-right">
          <span
            className="chart-trend"
            style={{
              color: chartColor,
            }}
          >
            {overallChange >= 0
              ? "+"
              : ""}
            {overallChange.toFixed(
              2
            )}
            %
          </span>

          <span className="chart-period">
            35 days
          </span>
        </div>
      </div>

      <div className="price-chart">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient
              id={gradientId}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor={
                  chartColor
                }
                stopOpacity="0.20"
              />

              <stop
                offset="100%"
                stopColor={
                  chartColor
                }
                stopOpacity="0"
              />
            </linearGradient>
          </defs>

          {[0, 1, 2].map(
            (index) => {
              const y =
                paddingTop +
                (index / 2) *
                  (height -
                    paddingTop -
                    paddingBottom);

              return (
                <line
                  key={index}
                  x1={paddingLeft}
                  y1={y}
                  x2={
                    width -
                    paddingRight
                  }
                  y2={y}
                  className="chart-grid-line"
                />
              );
            }
          )}

          <polygon
            points={areaPoints}
            fill={`url(#${gradientId})`}
          />

          <polyline
            points={points}
            fill="none"
            stroke={chartColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {data.map(
            (point, index) => {
              const x =
                getX(index);

              const y =
                getY(
                  Number(
                    point.price
                  )
                );

              const isHovered =
                hoveredPoint?.index ===
                index;

              return (
                <circle
                  key={index}
                  cx={x}
                  cy={y}
                  r={
                    isHovered
                      ? 4
                      : 2.5
                  }
                  fill={chartColor}
                  className="chart-point"
                  onMouseEnter={() =>
                    setHoveredPoint({
                      index,
                      x,
                      y,
                      date:
                        point.date,
                      price:
                        point.price,
                    })
                  }
                  onMouseLeave={() =>
                    setHoveredPoint(null)
                  }
                />
              );
            }
          )}

          <g
            transform={`translate(
              ${Math.max(
                4,
                Math.min(
                  latestX - 48,
                  width - 104
                )
              )}
              ${Math.max(
                5,
                latestY - 34
              )}
            )`}
            pointerEvents="none"
          >
            <rect
              width="96"
              height="25"
              rx="7"
              fill={chartColor}
            />

            <text
              x="48"
              y="16"
              textAnchor="middle"
              className="chart-tooltip-text"
            >
              ₹
              {Number(
                latestPoint.price
              ).toFixed(2)}
            </text>
          </g>

          {hoveredPoint && (
            <g
              transform={`translate(
                ${Math.max(
                  45,
                  Math.min(
                    hoveredPoint.x -
                      50,
                    width - 112
                  )
                )}
                ${Math.max(
                  4,
                  hoveredPoint.y -
                    48
                )}
              )`}
              pointerEvents="none"
            >
              <rect
                width="104"
                height="36"
                rx="7"
                className="hover-tooltip-box"
              />

              <text
                x="52"
                y="14"
                textAnchor="middle"
                className="hover-tooltip-price"
              >
                ₹
                {Number(
                  hoveredPoint.price
                ).toFixed(2)}
              </text>

              <text
                x="52"
                y="28"
                textAnchor="middle"
                className="hover-tooltip-date"
              >
                {new Date(
                  hoveredPoint.date
                ).toLocaleDateString(
                  "en-IN",
                  {
                    month: "short",
                    day: "numeric",
                  }
                )}
              </text>
            </g>
          )}

          {yLabels.map(
            (price, index) => {
              const y =
                paddingTop +
                (index / 2) *
                  (height -
                    paddingTop -
                    paddingBottom);

              return (
                <text
                  key={index}
                  x="4"
                  y={y + 3}
                  className="chart-axis-label"
                >
                  {Math.round(
                    price
                  ).toLocaleString(
                    "en-IN"
                  )}
                </text>
              );
            }
          )}

          {dateIndexes.map(
            (index) => {
              const point =
                data[index];

              return (
                <text
                  key={index}
                  x={getX(index)}
                  y={height - 7}
                  textAnchor="middle"
                  className="chart-axis-label"
                >
                  {new Date(
                    point.date
                  ).toLocaleDateString(
                    "en-IN",
                    {
                      month: "short",
                      day: "numeric",
                    }
                  )}
                </text>
              );
            }
          )}
        </svg>
      </div>
    </div>
  );
}

/* =========================================================
   Authentication Screen
   ========================================================= */

function AuthScreen({
  mode,
  setMode,
  email,
  setEmail,
  password,
  setPassword,
  onSubmit,
  onGuest,
  loading,
  error,
}) {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="logo-mark">
            N
          </div>

          <h1>Nudge</h1>
        </div>

        <p className="auth-subtitle">
          Track what matters.
          Know what changed.
        </p>

        <div className="auth-tabs">
          <button
            type="button"
            className={
              mode === "login"
                ? "active"
                : ""
            }
            onClick={() =>
              setMode("login")
            }
          >
            Log in
          </button>

          <button
            type="button"
            className={
              mode === "signup"
                ? "active"
                : ""
            }
            onClick={() =>
              setMode("signup")
            }
          >
            Create account
          </button>
        </div>

        <form
          className="auth-form"
          onSubmit={onSubmit}
        >
          <label>
            Email
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) =>
                setEmail(
                  event.target.value
                )
              }
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(event) =>
                setPassword(
                  event.target.value
                )
              }
              minLength={8}
              required
            />
          </label>

          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="auth-submit"
            disabled={loading}
          >
            {loading
              ? "Please wait..."
              : mode === "login"
              ? "Log in"
              : "Create account"}
          </button>
        </form>

        <div className="auth-divider">
          <span>or</span>
        </div>

        <button
          type="button"
          className="guest-button"
          onClick={onGuest}
        >
          Continue without login
        </button>

        <p className="auth-note">
          Use Nudge as a guest
          or create an account to
          save your progress.
        </p>
      </div>
    </div>
  );
}

/* =========================================================
   Login reminder
   ========================================================= */

function LoginReminder({
  onLogin,
  onDismiss,
}) {
  return (
    <div className="login-reminder">
      <div className="login-reminder-content">
        <strong>
          Save your progress
        </strong>

        <span>
          Log in for a better
          experience and to keep
          your watchlist and alerts.
        </span>
      </div>

      <div className="login-reminder-actions">
        <button
          type="button"
          onClick={onLogin}
        >
          Log in
        </button>

        <button
          type="button"
          className="dismiss-button"
          onClick={onDismiss}
          aria-label="Dismiss login reminder"
        >
          ×
        </button>
      </div>
    </div>
  );
}

/* =========================================================
   Main App
   ========================================================= */

function App() {
  /* -------------------------------------------------------
     Initial identity state
     ------------------------------------------------------- */

  const initialToken =
    localStorage.getItem(
      TOKEN_KEY
    );

  const initialGuestMode =
    localStorage.getItem(
      GUEST_MODE_KEY
    ) === "true";

  const [authReady, setAuthReady] =
    useState(!initialToken);

  const [authenticated, setAuthenticated] =
    useState(Boolean(initialToken));

  const [guestMode, setGuestMode] =
    useState(initialGuestMode);

  const [user, setUser] =
    useState(null);

  /* -------------------------------------------------------
     Authentication form
     ------------------------------------------------------- */

  const [authMode, setAuthMode] =
    useState("login");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [authError, setAuthError] =
    useState("");

  const [authLoading, setAuthLoading] =
    useState(false);

  const [showLoginReminder, setShowLoginReminder] =
    useState(
      initialGuestMode &&
        localStorage.getItem(
          GUEST_USED_KEY
        ) === "true"
    );

  /* -------------------------------------------------------
     Watchlist + market state
     ------------------------------------------------------- */

  const [watchlist, setWatchlist] =
    useState([]);

  const [ticker, setTicker] =
    useState("");

  const [errorMessage, setErrorMessage] =
    useState("");

  const [marketData, setMarketData] =
    useState({});

  const [signals, setSignals] =
    useState({});

  const [signalHistory, setSignalHistory] =
    useState({});

  const [showHistory, setShowHistory] =
    useState({});

  const [priceHistory, setPriceHistory] =
    useState({});

  const [dashboard, setDashboard] =
    useState({
      marketOverview: [],
      watchlistSummary: {
        total: 0,
        up: 0,
        down: 0,
        unchanged: 0,
        best: null,
        worst: null,
      },
      nudges: [],
      stocks: [],
    });

  const [loadingTicker, setLoadingTicker] =
    useState(null);

  const [refreshingAll, setRefreshingAll] =
    useState(false);

  const [toast, setToast] =
    useState("");

  /* -------------------------------------------------------
     Alerts
     ------------------------------------------------------- */

  const [alerts, setAlerts] =
    useState([]);

  const [alertForm, setAlertForm] =
    useState({
      ticker: "",
      condition: "below",
      targetPrice: "",
    });

  const [showAlertForm, setShowAlertForm] =
    useState(false);

  const [alertLoading, setAlertLoading] =
    useState(false);

  const [notificationsEnabled, setNotificationsEnabled] =
    useState(
      typeof Notification !==
        "undefined" &&
        Notification.permission ===
          "granted"
    );

  /* =======================================================
     Dashboard loading
     ======================================================= */

const loadDashboard = useCallback(async () => {
  try {
    const [
      watchlistResponse,
      dashboardResponse,
    ] = await Promise.all([
      fetch(
        `${API_URL}/api/watchlist`,
        {
          headers: getRequestHeaders(),
        }
      ),

      fetch(
        `${API_URL}/api/dashboard`,
        {
          headers: getRequestHeaders(),
        }
      ),
    ]);

    const watchlistData =
      await watchlistResponse.json();

    const dashboardData =
      await dashboardResponse.json();

    /* -----------------------------------------------------
       Watchlist
       ----------------------------------------------------- */

    if (watchlistResponse.ok) {
      setWatchlist(watchlistData);
    }

    /* -----------------------------------------------------
       Dashboard
       ----------------------------------------------------- */

    if (dashboardResponse.ok) {
      setDashboard(dashboardData);
      setErrorMessage("");

      /* ---------------------------------------------------
         Populate stock cards immediately.

         dashboard.stocks already contains:
         - price
         - changePercent
         - stale
         - unavailable
         - hasEnoughHistory
         --------------------------------------------------- */

      if (
        Array.isArray(
          dashboardData.stocks
        )
      ) {
        const stockMarketData = {};

        for (const stock of dashboardData.stocks) {
          stockMarketData[
            stock.ticker
          ] = {
            ticker: stock.ticker,
            price: stock.price,
            changePercent:
              stock.changePercent,
            stale: Boolean(
              stock.stale
            ),
            unavailable: Boolean(
              stock.unavailable
            ),
            hasEnoughHistory:
              Boolean(
                stock.hasEnoughHistory
              ),
            capturedAt:
              stock.capturedAt ||
              null,
          };
        }

        setMarketData(
          (previous) => ({
            ...previous,
            ...stockMarketData,
          })
        );
      }
    } else {
      setErrorMessage(
        dashboardData.message ||
          "Could not load market dashboard."
      );
    }
  } catch (error) {
    console.error(
      "Dashboard loading error:",
      error
    );

    setErrorMessage(
      "Could not load market dashboard."
    );
  }
}, []);

const loadPriceHistory =
  useCallback(async (stockTicker) => {
    try {
      const response =
        await fetch(
          `${API_URL}/api/market/${stockTicker}/history`,
          {
            headers:
              getRequestHeaders(),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        return;
      }

      setPriceHistory(
        (previous) => ({
          ...previous,
          [stockTicker]:
            data,
        })
      );
    } catch (error) {
      console.error(
        `Price history error for ${stockTicker}:`,
        error
      );
    }
  }, []);

  useEffect(() => {
  if (
    !authReady ||
    watchlist.length === 0
  ) {
    return;
  }

  const loadAllHistory =
    async () => {
      await Promise.all(
        watchlist.map(
          (stock) =>
            loadPriceHistory(
              stock.ticker
            )
        )
      );
    };

  loadAllHistory();
}, [
  authReady,
  watchlist,
  loadPriceHistory,
]);

  /* =======================================================
     Alert loading
     ======================================================= */

  const loadAlerts =
    useCallback(async () => {
      if (!authenticated) {
        setAlerts([]);
        return;
      }

      try {
        const response =
          await fetch(
            `${API_URL}/api/alerts`,
            {
              headers:
                getRequestHeaders(),
            }
          );

        const data =
          await response.json();

        if (response.ok) {
          setAlerts(data);
        }
      } catch (error) {
        console.error(
          "Alert loading error:",
          error
        );
      }
    }, [authenticated]);

  /* =======================================================
     Restore existing login session
     ======================================================= */

  useEffect(() => {
    if (!initialToken) {
      return;
    }

    let cancelled = false;

    const verifySession =
      async () => {
        try {
          const response =
            await fetch(
              `${API_URL}/api/auth/me`,
              {
                headers:
                  getRequestHeaders(),
              }
            );

          if (!response.ok) {
            localStorage.removeItem(
              TOKEN_KEY
            );

            if (!cancelled) {
              setAuthenticated(
                false
              );
              setGuestMode(
                false
              );
            }

            return;
          }

          const data =
            await response.json();

          if (!cancelled) {
            setUser(
              data.user
            );

            setAuthenticated(
              true
            );

            setGuestMode(
              false
            );
          }
        } catch (error) {
          console.error(
            "Session verification error:",
            error
          );

          localStorage.removeItem(
            TOKEN_KEY
          );

          if (!cancelled) {
            setAuthenticated(
              false
            );
            setGuestMode(
              false
            );
          }
        } finally {
          if (!cancelled) {
            setAuthReady(true);
          }
        }
      };

    verifySession();

    return () => {
      cancelled = true;
    };
  }, [initialToken]);

  /* =======================================================
     Load app data
     ======================================================= */

 useEffect(() => {
  if (!authReady) {
    return;
  }

  const timer = setTimeout(() => {
    loadDashboard();

    if (authenticated) {
      loadAlerts();
    }
  }, 0);

  return () => {
    clearTimeout(timer);
  };
}, [
  authReady,
  authenticated,
  loadDashboard,
  loadAlerts,
]);

  /* =======================================================
     Authentication
     ======================================================= */

  const handleAuth =
    async (event) => {
      event.preventDefault();

      setAuthError("");
      setAuthLoading(true);

      try {
        const endpoint =
          authMode === "login"
            ? "/api/auth/login"
            : "/api/auth/register";

        const response =
          await fetch(
            `${API_URL}${endpoint}`,
            {
              method: "POST",
              headers:
                getRequestHeaders(
                  true
                ),
              body: JSON.stringify({
                email:
                  email
                    .trim()
                    .toLowerCase(),

                password,
              }),
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          setAuthError(
            data.message ||
              "Authentication failed."
          );
          return;
        }

        localStorage.setItem(
          TOKEN_KEY,
          data.token
        );

        setUser(data.user);
        setAuthenticated(
          true
        );
        setGuestMode(
          false
        );

        localStorage.removeItem(
          GUEST_MODE_KEY
        );

        /*
         * Move the guest watchlist
         * into the new account.
         */
        try {
          await fetch(
            `${API_URL}/api/auth/migrate-guest`,
            {
              method: "POST",
              headers:
                getRequestHeaders(
                  true
                ),
              body: JSON.stringify({
                guestId:
                  getGuestId(),
              }),
            }
          );
        } catch (migrationError) {
          console.error(
            "Guest migration error:",
            migrationError
          );
        }

        setEmail("");
        setPassword("");
        setAuthError("");
        setShowLoginReminder(
          false
        );
        setAuthReady(true);

        await loadDashboard();
        await loadAlerts();
      } catch (error) {
        console.error(
          "Authentication error:",
          error
        );

        setAuthError(
          "Could not connect to Nudge."
        );
      } finally {
        setAuthLoading(false);
      }
    };

  const continueAsGuest =
    () => {
      getGuestId();

      localStorage.setItem(
        GUEST_MODE_KEY,
        "true"
      );

      localStorage.setItem(
        GUEST_USED_KEY,
        "true"
      );

      setGuestMode(true);
      setAuthenticated(
        false
      );
      setAuthReady(true);
      setShowLoginReminder(
        true
      );

      loadDashboard();
    };

  const openLogin = () => {
    setAuthMode("login");
    setAuthError("");
    setGuestMode(false);
  };

  const logout = () => {
    localStorage.removeItem(
      TOKEN_KEY
    );

    localStorage.removeItem(
      GUEST_MODE_KEY
    );

    setUser(null);
    setAuthenticated(
      false
    );
    setGuestMode(false);
    setAlerts([]);
    setNotificationsEnabled(
      false
    );

    setAuthMode("login");
    setEmail("");
    setPassword("");
    setAuthError("");
    setAuthReady(true);
  };

  /* =======================================================
     Add stock
     ======================================================= */

  const addStock = async (event) => {
  event.preventDefault();

  setErrorMessage("");

  const cleanTicker =
    ticker.trim().toUpperCase();

  if (!cleanTicker) {
    setErrorMessage(
      "Please enter a stock ticker."
    );
    return;
  }

  try {
    /* -----------------------------------------------------
       Add the stock
       ----------------------------------------------------- */

    const response = await fetch(
      `${API_URL}/api/watchlist`,
      {
        method: "POST",
        headers:
          getRequestHeaders(true),
        body: JSON.stringify({
          ticker: cleanTicker,
        }),
      }
    );

    const data =
      await response.json();

    if (!response.ok) {
      setErrorMessage(
        data.message ||
          "Could not add this stock."
      );
      return;
    }

    /* -----------------------------------------------------
       Update the watchlist immediately
       ----------------------------------------------------- */

    setWatchlist((previous) => [
      ...previous,
      data,
    ]);

    setTicker("");

    /* -----------------------------------------------------
       Guest reminder
       ----------------------------------------------------- */

    if (!authenticated) {
      localStorage.setItem(
        GUEST_USED_KEY,
        "true"
      );

      localStorage.setItem(
        GUEST_MODE_KEY,
        "true"
      );

      setShowLoginReminder(true);
    }

    /* -----------------------------------------------------
       Fetch the new stock's current data
       ----------------------------------------------------- */

    await fetchMarketData(
      cleanTicker
    );

    /* -----------------------------------------------------
       Reload dashboard so:
       - summary updates
       - stock count updates
       - nudges update
       ----------------------------------------------------- */

    await loadDashboard();

    /*
     * History is normally loaded automatically
     * by the watchlist/history effect.
     *
     * Calling it here as well makes the new
     * stock appear faster.
     */
    await loadPriceHistory(
      cleanTicker
    );

    setToast(
      `${cleanTicker} added to your watchlist.`
    );

    setTimeout(() => {
      setToast("");
    }, 2500);
  } catch (error) {
    console.error(
      "Add stock error:",
      error
    );

    setErrorMessage(
      "Could not connect to the market service. Please try again."
    );
  }
};


  /* =======================================================
     Fetch market data
     ======================================================= */

  const fetchMarketData =
    async (stockTicker) => {
      setLoadingTicker(
        stockTicker
      );

      setErrorMessage("");

      try {
        const response =
          await fetch(
            `${API_URL}/api/market/${stockTicker}`,
            {
              headers:
                getRequestHeaders(),
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          setErrorMessage(
            data.message ||
              "Could not fetch market data."
          );

          return;
        }

        setMarketData(
          (previous) => ({
            ...previous,
            [stockTicker]:
              data,
          })
        );

        /* -------------------------------------------------
           Price history
           ------------------------------------------------- */

        await loadPriceHistory(
  stockTicker
);

        /* -------------------------------------------------
           Logged-in personalization
           ------------------------------------------------- */

        if (authenticated) {
          const viewResponse =
            await fetch(
              `${API_URL}/api/market/${stockTicker}/view`,
              {
                method: "POST",
                headers:
                  getRequestHeaders(
                    true
                  ),
              }
            );

          const viewData =
            await viewResponse.json();

          if (
            viewResponse.ok
          ) {
            setSignals(
              (previous) => ({
                ...previous,
                [stockTicker]:
                  viewData.signalEvent,
              })
            );
          }
        }

        await loadDashboard();
      } catch (error) {
        console.error(
          "Market data error:",
          error
        );

        setErrorMessage(
          "Unable to fetch market data right now."
        );
      } finally {
        setLoadingTicker(
          null
        );
      }
    };

  /* =======================================================
     Refresh all
     ======================================================= */

  const refreshAllStocks =
    async () => {
      if (
        watchlist.length ===
          0 ||
        refreshingAll
      ) {
        return;
      }

      setRefreshingAll(
        true
      );

      setErrorMessage("");

      try {
        for (const stock of watchlist) {
          await fetchMarketData(
            stock.ticker
          );
        }

        await loadDashboard();

        setToast(
          "Your watchlist is up to date."
        );

        setTimeout(() => {
          setToast("");
        }, 2500);
      } catch (error) {
        console.error(
          "Refresh all error:",
          error
        );

        setErrorMessage(
          "Some market data could not be refreshed."
        );
      } finally {
        setRefreshingAll(
          false
        );
      }
    };

  /* =======================================================
     Remove stock
     ======================================================= */

  const removeStock =
    async (id) => {
      const confirmed =
        window.confirm(
          "Remove this stock from your watchlist?"
        );

      if (!confirmed) {
        return;
      }

      try {
        const response =
          await fetch(
            `${API_URL}/api/watchlist/${id}`,
            {
              method: "DELETE",
              headers:
                getRequestHeaders(),
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          setErrorMessage(
            data.message ||
              "Could not remove stock."
          );

          return;
        }

        setWatchlist(
          (previous) =>
            previous.filter(
              (stock) =>
                stock._id !== id
            )
        );

        await loadDashboard();
      } catch (error) {
        console.error(
          "Remove stock error:",
          error
        );

        setErrorMessage(
          "Could not remove this stock."
        );
      }
    };

  /* =======================================================
     Signal history
     ======================================================= */

  const fetchSignalHistory =
    async (stockTicker) => {
      if (!authenticated) {
        setShowLoginReminder(
          true
        );

        return;
      }

      try {
        const response =
          await fetch(
            `${API_URL}/api/signals/${stockTicker}/history`,
            {
              headers:
                getRequestHeaders(),
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          setErrorMessage(
            data.message ||
              "Could not fetch signal history."
          );

          return;
        }

        setSignalHistory(
          (previous) => ({
            ...previous,
            [stockTicker]:
              data,
          })
        );
      } catch (error) {
        console.error(
          "Signal history error:",
          error
        );

        setErrorMessage(
          "Could not fetch signal history."
        );
      }
    };

  /* =======================================================
     Feedback
     ======================================================= */

  const sendFeedback =
    async (
      signalId,
      feedback
    ) => {
      if (!authenticated) {
        setShowLoginReminder(
          true
        );

        return;
      }

      try {
        const response =
          await fetch(
            `${API_URL}/api/signals/${signalId}/feedback`,
            {
              method: "POST",
              headers:
                getRequestHeaders(
                  true
                ),
              body: JSON.stringify({
                feedback,
              }),
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          setErrorMessage(
            data.message ||
              "Could not save feedback."
          );

          return;
        }

        setSignals(
          (previous) => {
            const updated = {
              ...previous,
            };

            const tickerToRemove =
              Object.keys(
                updated
              ).find(
                (stockTicker) =>
                  updated[
                    stockTicker
                  ]?._id ===
                  signalId
              );

            if (
              tickerToRemove
            ) {
              delete updated[
                tickerToRemove
              ];
            }

            return updated;
          }
        );

        setToast(
          feedback === "useful"
            ? "Thanks — Nudge will use this feedback."
            : "Got it — we'll show fewer signals like this."
        );

        setTimeout(() => {
          setToast("");
        }, 2500);

        await loadDashboard();
      } catch (error) {
        console.error(
          "Feedback error:",
          error
        );

        setErrorMessage(
          "Could not save feedback."
        );
      }
    };

  /* =======================================================
     Browser notifications
     ======================================================= */

  const enableBrowserNotifications =
    async () => {
      if (!authenticated) {
        setShowLoginReminder(
          true
        );

        return false;
      }

      if (
        !("Notification" in
          window) ||
        !("serviceWorker" in
          navigator) ||
        !("PushManager" in
          window)
      ) {
        setToast(
          "Browser notifications are not supported here."
        );

        setTimeout(() => {
          setToast("");
        }, 3000);

        return false;
      }

      try {
        let permission =
          Notification.permission;

        if (
          permission !==
          "granted"
        ) {
          permission =
            await Notification.requestPermission();
        }

        if (
          permission !==
          "granted"
        ) {
          setToast(
            "Notifications were not enabled."
          );

          setTimeout(() => {
            setToast("");
          }, 2500);

          return false;
        }

        const registration =
          await navigator.serviceWorker.register(
            "/sw.js"
          );

        const keyResponse =
          await fetch(
            `${API_URL}/api/push/public-key`,
            {
              headers:
                getRequestHeaders(),
            }
          );

        const keyData =
          await keyResponse.json();

        if (!keyResponse.ok) {
          throw new Error(
            keyData.message ||
              "Push notifications are not configured."
          );
        }

        let subscription =
          await registration.pushManager.getSubscription();

        if (!subscription) {
          subscription =
            await registration.pushManager.subscribe(
              {
                userVisibleOnly:
                  true,

                applicationServerKey:
                  urlBase64ToUint8Array(
                    keyData.publicKey
                  ),
              }
            );
        }

        const saveResponse =
          await fetch(
            `${API_URL}/api/push/subscribe`,
            {
              method: "POST",
              headers:
                getRequestHeaders(
                  true
                ),
              body: JSON.stringify(
                subscription
              ),
            }
          );

        const saveData =
          await saveResponse.json();

        if (!saveResponse.ok) {
          throw new Error(
            saveData.message ||
              "Could not save notification subscription."
          );
        }

        setNotificationsEnabled(
          true
        );

        setToast(
          "Browser notifications are enabled."
        );

        setTimeout(() => {
          setToast("");
        }, 2500);

        return true;
      } catch (error) {
        console.error(
          "Notification setup error:",
          error
        );

        setToast(
          "Could not enable browser notifications."
        );

        setTimeout(() => {
          setToast("");
        }, 3000);

        return false;
      }
    };

  /* =======================================================
     Load alerts after login
     ======================================================= */

  const openAlertForm =
    (stockTicker = "") => {
      if (!authenticated) {
        setShowLoginReminder(
          true
        );

        return;
      }

      setAlertForm({
        ticker:
          stockTicker,
        condition:
          "below",
        targetPrice:
          "",
      });

      setShowAlertForm(
        true
      );
    };

  /* =======================================================
     Create alert
     ======================================================= */

  const createAlert =
    async (event) => {
      event.preventDefault();

      if (!authenticated) {
        setShowLoginReminder(
          true
        );

        return;
      }

      setAlertLoading(
        true
      );

      setErrorMessage("");

      try {
        /*
         * A price alert requires
         * browser push to be ready.
         */
        const pushReady =
          notificationsEnabled ||
          (await enableBrowserNotifications());

        if (!pushReady) {
          setErrorMessage(
            "Enable browser notifications before creating a price alert."
          );

          return;
        }

        const cleanTicker =
          alertForm.ticker
            .trim()
            .toUpperCase();

        const targetPrice =
          Number(
            alertForm.targetPrice
          );

        if (!cleanTicker) {
          setErrorMessage(
            "Select a stock."
          );

          return;
        }

        if (
          !Number.isFinite(
            targetPrice
          ) ||
          targetPrice <= 0
        ) {
          setErrorMessage(
            "Enter a valid target price."
          );

          return;
        }

        const response =
          await fetch(
            `${API_URL}/api/alerts`,
            {
              method: "POST",
              headers:
                getRequestHeaders(
                  true
                ),
              body: JSON.stringify({
                ticker:
                  cleanTicker,

                condition:
                  alertForm.condition,

                targetPrice,
              }),
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          setErrorMessage(
            data.message ||
              "Could not create price alert."
          );

          return;
        }

        setAlerts(
          (previous) => [
            data,
            ...previous,
          ]
        );

        setShowAlertForm(
          false
        );

        setAlertForm({
          ticker: "",
          condition:
            "below",
          targetPrice:
            "",
        });

        setToast(
          "Price alert created."
        );

        setTimeout(() => {
          setToast("");
        }, 2500);
      } catch (error) {
        console.error(
          "Create alert error:",
          error
        );

        setErrorMessage(
          "Could not create price alert."
        );
      } finally {
        setAlertLoading(
          false
        );
      }
    };

  /* =======================================================
     Toggle alert
     ======================================================= */

  const toggleAlert =
    async (id) => {
      try {
        const response =
          await fetch(
            `${API_URL}/api/alerts/${id}/toggle`,
            {
              method: "PATCH",
              headers:
                getRequestHeaders(),
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          setErrorMessage(
            data.message ||
              "Could not update alert."
          );

          return;
        }

        setAlerts(
          (previous) =>
            previous.map(
              (alert) =>
                alert._id === id
                  ? data
                  : alert
            )
        );
      } catch (error) {
        console.error(
          "Toggle alert error:",
          error
        );

        setErrorMessage(
          "Could not update alert."
        );
      }
    };

  /* =======================================================
     Delete alert
     ======================================================= */

  const deleteAlert =
    async (id) => {
      try {
        const response =
          await fetch(
            `${API_URL}/api/alerts/${id}`,
            {
              method: "DELETE",
              headers:
                getRequestHeaders(),
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          setErrorMessage(
            data.message ||
              "Could not remove alert."
          );

          return;
        }

        setAlerts(
          (previous) =>
            previous.filter(
              (alert) =>
                alert._id !== id
            )
        );

        setToast(
          "Alert removed."
        );

        setTimeout(() => {
          setToast("");
        }, 2000);
      } catch (error) {
        console.error(
          "Delete alert error:",
          error
        );
      }
    };

  /* =======================================================
     Auth loading
     ======================================================= */

  if (!authReady) {
    return (
      <div className="auth-page">
        <div className="auth-card auth-loading">
          <div className="logo-mark">
            N
          </div>

          <h1>Nudge</h1>

          <p className="auth-note">
            Checking your account...
          </p>
        </div>
      </div>
    );
  }

  /* =======================================================
     Authentication screen
     ======================================================= */

  if (
    !authenticated &&
    !guestMode
  ) {
    return (
      <AuthScreen
        mode={authMode}
        setMode={(mode) => {
          setAuthMode(mode);
          setAuthError("");
        }}
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        onSubmit={handleAuth}
        onGuest={continueAsGuest}
        loading={authLoading}
        error={authError}
      />
    );
  }

  /* =======================================================
     Main application
     ======================================================= */

  return (
    <div className="app">
      {/* Toast */}
      {toast && (
        <div className="toast">
          {toast}
        </div>
      )}

      {/* Login reminder */}
      {guestMode &&
        showLoginReminder && (
          <LoginReminder
            onLogin={
              openLogin
            }
            onDismiss={() =>
              setShowLoginReminder(
                false
              )
            }
          />
        )}

      {/* ===================================================
          Header
          =================================================== */}

      <header className="header">
        <div className="header-top">
          <div className="logo">
            <div className="logo-mark">
              N
            </div>

            <div>
              <h1>Nudge</h1>

              <p className="subtitle">
                Track what matters.
                Know what changed.
              </p>
            </div>
          </div>

          <div className="header-actions">
            <div className="market-pill">
              ● Market data
            </div>

            {authenticated ? (
              <button
                type="button"
                className="account-button"
                onClick={logout}
              >
                <span>
                  {user?.email ||
                    "Account"}
                </span>

                <small>
                  Log out
                </small>
              </button>
            ) : (
              <button
                type="button"
                className="account-button"
                onClick={
                  openLogin
                }
              >
                Log in
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ===================================================
          Guest / account strip
          =================================================== */}

      {authenticated ? (
        <div className="account-strip">
          <span>
            Signed in as{" "}
            <strong>
              {user?.email}
            </strong>
          </span>

          <button
            type="button"
            onClick={
              enableBrowserNotifications
            }
          >
            {notificationsEnabled
              ? "✓ Notifications enabled"
              : "Enable notifications"}
          </button>
        </div>
      ) : (
        <div className="guest-strip">
          <span>
            You're using Nudge
            as a guest.
          </span>

          <button
            type="button"
            onClick={
              openLogin
            }
          >
            Log in to save progress
          </button>
        </div>
      )}

      {/* ===================================================
          Add stock
          =================================================== */}

      <section className="add-section">
        <form
          onSubmit={addStock}
          className="add-form"
        >
          <input
            type="text"
            placeholder="Enter ticker e.g. RELIANCE"
            value={ticker}
            onChange={(event) =>
              setTicker(
                event.target.value
              )
            }
          />

          <button type="submit">
            Add Stock
          </button>
        </form>

        {errorMessage && (
          <div className="error-message">
            {errorMessage}
          </div>
        )}
      </section>

      {/* ===================================================
          Market Overview
          =================================================== */}

      <section className="dashboard-section">
        <div className="section-heading">
          <div>
            <h2>
              Market Overview
            </h2>

            <p>
              A quick look at the
              broader market.
            </p>
          </div>
        </div>

        <div className="market-overview">
          {dashboard.marketOverview.map(
            (market) => {
              const positive =
                market.changePercent !==
                  null &&
                market.changePercent >=
                  0;

              return (
                <div
                  className="market-card"
                  key={
                    market.symbol
                  }
                >
                  <span className="market-name">
                    {market.name}
                  </span>

                  <strong>
                    {market.price !==
                    null
                      ? market.price.toLocaleString(
                          "en-IN",
                          {
                            maximumFractionDigits: 2,
                          }
                        )
                      : "Unavailable"}
                  </strong>

                  <span
                    className={
                      market.changePercent ===
                      null
                        ? "market-change neutral"
                        : positive
                        ? "market-change positive"
                        : "market-change negative"
                    }
                  >
                    {market.changePercent !== null
  ? `${positive ? "+" : ""}${market.changePercent.toFixed(2)}%`
  : "Data unavailable"}

                  </span>
                </div>
              );
            }
          )}
        </div>
      </section>

      {/* ===================================================
          Today's Nudges
          =================================================== */}

      <section className="dashboard-section">
        <div className="section-heading">
          <div>
            <h2>
              Today's Nudges
            </h2>

            <p>
              Things that may
              deserve your attention.
            </p>
          </div>

          <span className="nudge-count">
            {dashboard.nudges.length}{" "}
            {dashboard.nudges.length ===
            1
              ? "nudge"
              : "nudges"}
          </span>
        </div>

        {dashboard.nudges.length ===
        0 ? (
          <div className="nudges-empty">
            Nothing meaningful needs
            your attention right now.
          </div>
        ) : (
          <div className="nudge-list">
            {dashboard.nudges.map(
              (nudge) => (
                <button
                  type="button"
                  className="nudge-card"
                  key={
                    nudge.ticker
                  }
                  onClick={() => {
                    document
                      .getElementById(
                        `stock-${nudge.ticker}`
                      )
                      ?.scrollIntoView({
                        behavior:
                          "smooth",
                        block:
                          "center",
                      });
                  }}
                >
                  <div className="nudge-main">
                    <strong>
                      {nudge.ticker}
                    </strong>

                    <span>
                      {nudge.changePercent >=
                      0
                        ? "+"
                        : ""}
                      {nudge.changePercent.toFixed(
                        2
                      )}
                      %
                    </span>
                  </div>

                  <p className="nudge-reason">
                    {nudge.reason}
                  </p>

                  {nudge.contextText && (
                    <p className="nudge-context">
                      {
                        nudge.contextText
                      }
                    </p>
                  )}

                  <div className="nudge-evidence">
                    {nudge.zScore !==
                      undefined && (
                      <span>
                        {Number(
                          nudge.zScore
                        ).toFixed(
                          2
                        )}
                        σ unusual
                      </span>
                    )}

                    {nudge.volumeRatio !==
                      undefined && (
                      <span>
                        {Number(
                          nudge.volumeRatio
                        ).toFixed(
                          2
                        )}
                        × volume
                      </span>
                    )}
                  </div>

                  {nudge.suggestion && (
                    <div className="nudge-suggestion">
                      {
                        nudge.suggestion
                      }
                    </div>
                  )}
                </button>
              )
            )}
          </div>
        )}
      </section>

      {/* ===================================================
          Watchlist Summary
          =================================================== */}

      <section className="dashboard-section">
        <div className="section-heading">
          <div>
            <h2>
              Watchlist Summary
            </h2>

            <p>
              See what changed
              without the noise.
            </p>
          </div>

          <div className="watchlist-tools">
            <span className="stock-count">
              {
                dashboard
                  .watchlistSummary
                  .total
              }{" "}
              {dashboard
                .watchlistSummary
                .total === 1
                ? "stock"
                : "stocks"}
            </span>

            <button
              type="button"
              className="refresh-all-button"
              onClick={
                refreshAllStocks
              }
              disabled={
                refreshingAll ||
                watchlist.length ===
                  0
              }
            >
              {refreshingAll
                ? "Refreshing..."
                : "Refresh all"}
            </button>
          </div>
        </div>

        <div className="watchlist-summary">
          <div className="summary-item">
            <span>
              Up today
            </span>

            <strong className="summary-positive">
              {
                dashboard
                  .watchlistSummary
                  .up
              }
            </strong>
          </div>

          <div className="summary-item">
            <span>
              Down today
            </span>

            <strong className="summary-negative">
              {
                dashboard
                  .watchlistSummary
                  .down
              }
            </strong>
          </div>

          <div className="summary-item">
            <span>
              Best movement
            </span>

            <strong>
              {dashboard
                .watchlistSummary
                .best
                ? `${
                    dashboard
                      .watchlistSummary
                      .best
                      .ticker
                  } ${
                    dashboard
                      .watchlistSummary
                      .best
                      .changePercent >=
                    0
                      ? "+"
                      : ""
                  }${
                    dashboard
                      .watchlistSummary
                      .best
                      .changePercent
                  }%`
                : "—"}
            </strong>
          </div>

          <div className="summary-item">
            <span>
              Largest drop
            </span>

            <strong>
              {dashboard
                .watchlistSummary
                .worst
                ? `${
                    dashboard
                      .watchlistSummary
                      .worst
                      .ticker
                  } ${
                    dashboard
                      .watchlistSummary
                      .worst
                      .changePercent >=
                    0
                      ? "+"
                      : ""
                  }${
                    dashboard
                      .watchlistSummary
                      .worst
                      .changePercent
                  }%`
                : "—"}
            </strong>
          </div>
        </div>
      </section>

      {/* ===================================================
          Price Alerts
          =================================================== */}

      {authenticated && (
        <section className="dashboard-section">
          <div className="section-heading">
            <div>
              <h2>
                Price Alerts
              </h2>

              <p>
                Get a browser
                notification when
                your condition is met.
              </p>
            </div>

            <div className="alert-heading-actions">
              <button
                type="button"
                className="notification-button"
                onClick={
                  enableBrowserNotifications
                }
              >
                {notificationsEnabled
                  ? "✓ Notifications on"
                  : "Enable notifications"}
              </button>

              <button
                type="button"
                className="refresh-all-button"
                onClick={() =>
                  openAlertForm()
                }
              >
                + New alert
              </button>
            </div>
          </div>

          {showAlertForm && (
            <form
              className="alert-form"
              onSubmit={
                createAlert
              }
            >
              <div className="alert-form-title">
                Create price alert
              </div>

              <select
                value={
                  alertForm.ticker
                }
                onChange={(event) =>
                  setAlertForm(
                    (previous) => ({
                      ...previous,
                      ticker:
                        event.target
                          .value,
                    })
                  )
                }
                required
              >
                <option value="">
                  Select a stock
                </option>

                {watchlist.map(
                  (stock) => (
                    <option
                      key={
                        stock._id
                      }
                      value={
                        stock.ticker
                      }
                    >
                      {
                        stock.ticker
                      }
                    </option>
                  )
                )}
              </select>

              <select
                value={
                  alertForm.condition
                }
                onChange={(event) =>
                  setAlertForm(
                    (previous) => ({
                      ...previous,
                      condition:
                        event.target
                          .value,
                    })
                  )
                }
              >
                <option value="below">
                  Price goes below
                </option>

                <option value="above">
                  Price goes above
                </option>
              </select>

              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Target price"
                value={
                  alertForm.targetPrice
                }
                onChange={(event) =>
                  setAlertForm(
                    (previous) => ({
                      ...previous,
                      targetPrice:
                        event.target
                          .value,
                    })
                  )
                }
                required
              />

              <div className="alert-form-actions">
                <button
                  type="submit"
                  className="primary-action"
                  disabled={
                    alertLoading
                  }
                >
                  {alertLoading
                    ? "Creating..."
                    : "Create alert"}
                </button>

                <button
                  type="button"
                  className="secondary-action"
                  onClick={() =>
                    setShowAlertForm(
                      false
                    )
                  }
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {alerts.length ===
          0 ? (
            <div className="nudges-empty">
              You don't have any
              price alerts yet.
            </div>
          ) : (
            <div className="alerts-list">
              {alerts.map(
                (alert) => (
                  <div
                    className="alert-item"
                    key={
                      alert._id
                    }
                  >
                    <div>
                      <strong>
                        {
                          alert.ticker
                        }
                      </strong>

                      <span>
                        {alert.condition ===
                        "below"
                          ? "Below"
                          : "Above"}{" "}
                        ₹
                        {Number(
                          alert.targetPrice
                        ).toLocaleString(
                          "en-IN"
                        )}
                      </span>

                      {alert.triggeredAt && (
                        <small className="alert-triggered">
                          Triggered
                        </small>
                      )}
                    </div>

                    <div className="alert-item-actions">
                      <button
                        type="button"
                        onClick={() =>
                          toggleAlert(
                            alert._id
                          )
                        }
                        className={
                          alert.active
                            ? "alert-active"
                            : "alert-inactive"
                        }
                      >
                        {alert.active
                          ? "Active"
                          : "Off"}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          deleteAlert(
                            alert._id
                          )
                        }
                        className="alert-remove"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </section>
      )}

      {/* ===================================================
          Your Stocks
          =================================================== */}

      <section className="watchlist-section">
        <div className="section-heading">
          <div>
            <h2>
              Your Stocks
            </h2>

            <p>
              Explore the stocks
              you are following.
            </p>
          </div>

          <span className="stock-count">
            {watchlist.length}{" "}
            {watchlist.length === 1
              ? "stock"
              : "stocks"}
          </span>
        </div>

        {watchlist.length ===
        0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              ✦
            </div>

            <h3>
              Nothing on your
              watchlist yet
            </h3>

            <p>
              Add a stock above
              and Nudge will let
              you know when
              something meaningful
              happens.
            </p>

            <span className="empty-hint">
              No noise. Just
              useful signals.
            </span>
          </div>
        ) : (
          <div className="watchlist">
            {watchlist.map(
              (stock) => {
                const data =
                  marketData[
                    stock.ticker
                  ];

                const signal =
                  signals[
                    stock.ticker
                  ];

                const history =
                  priceHistory[
                    stock.ticker
                  ];

                return (
                  <div
                    className="stock-card"
                    id={`stock-${stock.ticker}`}
                    key={
                      stock._id
                    }
                  >
                    {/* STOCK HEADER */}

                    <div className="stock-header">
                      <div>
                        <h3 className="stock-name">
                          {
                            stock.ticker
                          }
                        </h3>

                        <p className="stock-subtitle">
                          {COMPANY_NAMES[
                            stock
                              .ticker
                          ] ||
                            "Tracked stock"}
                        </p>
                      </div>

                      {data && (
                        <span
                          className={`market-status ${
                            data.stale
                              ? "stale"
                              : ""
                          }`}
                        >
                          {data.stale
                            ? "Data delayed"
                            : "Market data available"}
                        </span>
                      )}
                    </div>

                    {/* MARKET DATA */}

                    {loadingTicker ===
                      stock.ticker && (
                      <div className="loading-message">
                        Checking the
                        latest market
                        data...
                      </div>
                    )}

                    {data ? (
                      <div className="market-info">
                        <div className="price-row">
                          <p className="price">
                            {data.price !==
                            null
                              ? `₹${Number(
                                  data.price
                                ).toLocaleString(
                                  "en-IN",
                                  {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  }
                                )}`
                              : "Unavailable"}
                          </p>

                          {data.changePercent !==
                            null &&
                            data.changePercent !==
                              undefined && (
                              <span
                                className={`change ${
                                  data.changePercent >
                                  0
                                    ? "positive"
                                    : data.changePercent <
                                      0
                                    ? "negative"
                                    : ""
                                }`}
                              >
                                {data.changePercent >
                                0
                                  ? "+"
                                  : ""}
                                {Number(
                                  data.changePercent
                                ).toFixed(
                                  2
                                )}
                                %
                              </span>
                            )}
                        </div>

                        <p className="volume">
                          Volume:{" "}
                          {data.volume
                            ? Number(
                                data.volume
                              ).toLocaleString(
                                "en-IN"
                              )
                            : "—"}
                        </p>

                        {data.stale && (
                          <div className="stock-status stale-status">
                            Data may be
                            delayed.
                            Showing the
                            last available
                            price.
                          </div>
                        )}

                        {data.unavailable && (
                          <div className="stock-status unavailable-status">
                            Market data is
                            temporarily
                            unavailable.
                          </div>
                        )}

                        {data.hasEnoughHistory ===
                          false && (
                          <div className="stock-status history-status">
                            Not enough
                            history yet to
                            detect
                            meaningful
                            changes.
                          </div>
                        )}

                        {history && (
                          <PriceChart
                            data={
                              history
                            }
                          />
                        )}
                      </div>
                    ) : (
                      <div className="no-data">
                        <p>
                          Market data
                          hasn't been
                          checked yet.
                        </p>

                        <p>
                          Check the market
                          to see what
                          changed.
                        </p>
                      </div>
                    )}

                    {/* SIGNAL */}

                    {data && (
                      <div className="signal-wrapper">
                        {authenticated &&
                        signal ? (
                          <div
                            className={`signal signal-${signal.urgency?.toLowerCase()}`}
                          >
                            <div className="signal-top">
                              <div>
                                <span className="signal-label">
                                  Worth a
                                  closer look
                                </span>

                                <h4>
                                  Something
                                  unusual
                                  happened
                                </h4>
                              </div>

                              <span className="signal-urgency">
                                {
                                  signal.urgency
                                }
                              </span>
                            </div>

                            <p className="signal-reason">
                              {
                                signal.reason
                              }
                            </p>

                            <div className="signal-evidence">
                              <div>
                                <span>
                                  Movement
                                </span>

                                <strong>
                                  {Number(
                                    signal.magnitude
                                  ).toFixed(
                                    2
                                  )}
                                  %
                                </strong>
                              </div>

                              {signal.zScore !==
                                undefined && (
                                <div>
                                  <span>
                                    Unusualness
                                  </span>

                                  <strong>
                                    {Number(
                                      signal.zScore
                                    ).toFixed(
                                      2
                                    )}
                                    σ
                                  </strong>
                                </div>
                              )}

                              {signal.volumeRatio !==
                                undefined && (
                                <div>
                                  <span>
                                    Volume
                                  </span>

                                  <strong>
                                    {Number(
                                      signal.volumeRatio
                                    ).toFixed(
                                      2
                                    )}
                                    ×
                                  </strong>
                                </div>
                              )}
                            </div>

                            <div className="feedback">
                              <span>
                                Was this
                                useful?
                              </span>

                              <button
                                type="button"
                                onClick={() =>
                                  sendFeedback(
                                    signal._id,
                                    "useful"
                                  )
                                }
                              >
                                Useful
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  sendFeedback(
                                    signal._id,
                                    "not_for_me"
                                  )
                                }
                              >
                                Not for me
                              </button>
                            </div>
                          </div>
                        ) : authenticated ? (
                          <div className="signal signal-calm">
                            <p>
                              ○ Nothing
                              meaningful
                              since you
                              last
                              checked.
                            </p>
                          </div>
                        ) : (
                          <div className="guest-signal">
                            Log in to
                            personalize
                            signals to your
                            activity.
                          </div>
                        )}
                      </div>
                    )}

                    {/* ACTIONS */}

                    <div className="actions">
                      <button
                        type="button"
                        className="primary-action"
                        onClick={() =>
                          fetchMarketData(
                            stock.ticker
                          )
                        }
                        disabled={
                          loadingTicker ===
                          stock.ticker
                        }
                      >
                        {loadingTicker ===
                        stock.ticker
                          ? "Checking..."
                          : "Check Market"}
                      </button>

                      <button
                        type="button"
                        className="secondary-action"
                        onClick={() => {
                          if (
                            !authenticated
                          ) {
                            setShowLoginReminder(
                              true
                            );

                            return;
                          }

                          if (
                            !signalHistory[
                              stock.ticker
                            ]
                          ) {
                            fetchSignalHistory(
                              stock.ticker
                            );
                          }

                          setShowHistory(
                            (
                              previous
                            ) => ({
                              ...previous,
                              [stock
                                .ticker]:
                                !previous[
                                  stock
                                    .ticker
                                ],
                            })
                          );
                        }}
                      >
                        {showHistory[
                          stock.ticker
                        ]
                          ? "Hide History"
                          : "View History"}
                      </button>

                      <button
                        type="button"
                        className="alert-action"
                        onClick={() =>
                          openAlertForm(
                            stock.ticker
                          )
                        }
                      >
                        🔔 Set Alert
                      </button>

                      <button
                        type="button"
                        className="remove-action"
                        onClick={() =>
                          removeStock(
                            stock._id
                          )
                        }
                      >
                        Remove
                      </button>
                    </div>

                    {/* HISTORY */}

                    {showHistory[
                      stock.ticker
                    ] && (
                      <div className="history">
                        <h4>
                          Signal History
                        </h4>

                        {!signalHistory[
                          stock.ticker
                        ] ||
                        signalHistory[
                          stock.ticker
                        ].length ===
                          0 ? (
                          <p>
                            No previous
                            meaningful
                            signals.
                          </p>
                        ) : (
                          signalHistory[
                            stock.ticker
                          ].map(
                            (event) => (
                              <div
                                className="history-item"
                                key={
                                  event._id
                                }
                              >
                                <strong>
                                  {
                                    event.ticker
                                  }
                                </strong>

                                <p>
                                  {
                                    event.reason
                                  }
                                </p>

                                <small>
                                  {new Date(
                                    event.createdAt
                                  ).toLocaleString()}
                                </small>
                              </div>
                            )
                          )
                        )}
                      </div>
                    )}
                  </div>
                );
              }
            )}
          </div>
        )}
      </section>
    </div>
  );
}

export default App;