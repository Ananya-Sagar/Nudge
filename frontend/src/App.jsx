import {
  useCallback,
  useEffect,
  useState,
} from "react";

import "./App.css";

const API_URL = import.meta.env.DEV
  ? "http://localhost:5000"
  : "https://nudge-obc3.onrender.com";

const TOKEN_KEY = "nudge_auth_token";
const GUEST_ID_KEY = "nudge_guest_id";
const GUEST_MODE_KEY = "nudge_guest_mode";
const GUEST_USED_KEY = "nudge_guest_used";

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
   Helpers
   ========================================================= */

const getGuestId = () => {
  let guestId =
    localStorage.getItem(GUEST_ID_KEY);

  if (!guestId) {
    guestId = `guest-${crypto.randomUUID()}`;

    localStorage.setItem(
      GUEST_ID_KEY,
      guestId
    );
  }

  return guestId;
};

const getToken = () => {
  return localStorage.getItem(TOKEN_KEY);
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


const getDefaultDashboard = () => ({
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

/* =========================================================
   Price Chart
   ========================================================= */

function PriceChart({ data }) {
  const [hoveredPoint, setHoveredPoint] =
    useState(null);

  if (!data || data.length < 2) {
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

  const prices = data.map((point) =>
    Number(point.price)
  );

  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange =
    maxPrice - minPrice || 1;

  const firstPrice = prices[0];
  const lastPrice =
    prices[prices.length - 1];

  const overallChange =
    firstPrice > 0
      ? ((lastPrice - firstPrice) /
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
    (index / (data.length - 1)) *
      (width -
        paddingLeft -
        paddingRight);

  const getY = (price) =>
    paddingTop +
    (1 -
      (price - minPrice) /
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
    `${getX(data.length - 1)},${
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
    minPrice + priceRange / 2,
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
            {overallChange.toFixed(2)}
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
                stopColor={chartColor}
                stopOpacity="0.20"
              />

              <stop
                offset="100%"
                stopColor={chartColor}
                stopOpacity="0"
              />
            </linearGradient>
          </defs>

          {/* Grid */}

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

          {/* Shading */}

          <polygon
            points={areaPoints}
            fill={`url(#${gradientId})`}
          />

          {/* Main line */}

          <polyline
            points={points}
            fill="none"
            stroke={chartColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points */}

          {data.map(
            (point, index) => {
              const x =
                getX(index);

              const y =
                getY(
                  Number(point.price)
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
                      date: point.date,
                      price: point.price,
                    })
                  }
                  onMouseLeave={() =>
                    setHoveredPoint(
                      null
                    )
                  }
                />
              );
            }
          )}

          {/* Current price bubble */}

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

          {/* Hover tooltip */}

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

          {/* Y-axis */}

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

          {/* X-axis */}

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
   App
   ========================================================= */

function App() {
  /* =========================
     Authentication
     ========================= */

  const [authReady, setAuthReady] =
    useState(false);

  const [authenticated, setAuthenticated] =
    useState(false);

  const [user, setUser] =
    useState(null);

  const [authScreenOpen, setAuthScreenOpen] =
    useState(false);

  const [guestPromptOpen, setGuestPromptOpen] =
    useState(false);

  const [authMode, setAuthMode] =
    useState("login");

  const [authEmail, setAuthEmail] =
    useState("");

  const [authPassword, setAuthPassword] =
    useState("");

  const [authMessage, setAuthMessage] =
    useState("");

  const [authLoading, setAuthLoading] =
    useState(false);

  /* =========================
     Main application state
     ========================= */

  const [watchlist, setWatchlist] =
    useState([]);

  const [ticker, setTicker] =
    useState("");

  const [errorMessage, setErrorMessage] =
    useState("");

    const [activity] = useState([]);

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
    useState(getDefaultDashboard());

  const [loadingTicker, setLoadingTicker] =
    useState(null);

  const [toast, setToast] =
    useState("");

  const [refreshingAll, setRefreshingAll] =
    useState(false);


  /* =========================================================
     Session restore
     ========================================================= */

  useEffect(() => {
    let mounted = true;

    const restoreSession = async () => {
      const token = getToken();

      if (!token) {
        const guestMode =
          localStorage.getItem(GUEST_MODE_KEY) ===
          "true";

        if (mounted) {
          setAuthenticated(false);
          setUser(null);
          setAuthScreenOpen(!guestMode);
          setAuthReady(true);
        }

        return;
      }

      try {
        const response =
          await fetch(
            `${API_URL}/api/auth/me`,
            {
              headers:
                getRequestHeaders(),
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Session expired."
          );
        }

        if (mounted) {
          setAuthenticated(true);
          setUser(data.user);
          localStorage.setItem(
            GUEST_MODE_KEY,
            "false"
          );
        }
      } catch (error) {
        console.error(
          "Session restore error:",
          error
        );

        localStorage.removeItem(
          TOKEN_KEY
        );

        const guestMode =
          localStorage.getItem(GUEST_MODE_KEY) ===
          "true";

        if (mounted) {
          setAuthenticated(false);
          setUser(null);
          setAuthScreenOpen(!guestMode);
        }
      } finally {
        if (mounted) {
          setAuthReady(true);
        }
      }
    };

    restoreSession();

    return () => {
      mounted = false;
    };
  }, []);


  /* =========================================================
     Dashboard
     ========================================================= */

  const loadDashboard =
    useCallback(async () => {
      try {
        const [
          watchlistResponse,
          dashboardResponse,
        ] = await Promise.all([
          fetch(
            `${API_URL}/api/watchlist`,
            {
              headers:
                getRequestHeaders(),
            }
          ),

          fetch(
            `${API_URL}/api/dashboard`,
            {
              headers:
                getRequestHeaders(),
            }
          ),
        ]);

        const watchlistData =
          await watchlistResponse.json();

        const dashboardData =
          await dashboardResponse.json();

        if (watchlistResponse.ok) {
          setWatchlist(
            Array.isArray(
              watchlistData
            )
              ? watchlistData
              : []
          );
        }

        if (dashboardResponse.ok) {
          setDashboard(
            dashboardData
          );

          setErrorMessage("");
        } else if (
          dashboardResponse.status ===
            401 &&
          !authenticated
        ) {
          setDashboard(
            getDefaultDashboard()
          );

          setErrorMessage("");
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
    }, [authenticated]);

  /* =========================================================
     Guest mode
     ========================================================= */

  const continueAsGuest = () => {
    localStorage.setItem(
      GUEST_MODE_KEY,
      "true"
    );

    setGuestPromptOpen(false);
    setAuthScreenOpen(false);
    setAuthMessage("");
  };

  /* =========================================================
     Authentication submit
     ========================================================= */

const submitAuth = async (event) => {
  event.preventDefault();

  setAuthMessage("");

  const email = authEmail.trim();

  if (!email) {
    setAuthMessage(
      "Please enter your email address."
    );
    return;
  }

  if (!authPassword) {
    setAuthMessage(
      "Please enter your password."
    );
    return;
  }

  setAuthLoading(true);

  try {
    /*
     * Save the guest ID BEFORE logging in.
     * This is the ID that owns the guest watchlist.
     */
    const guestId =
      localStorage.getItem(
        GUEST_ID_KEY
      );

    /*
     * Login / register
     */
    const response = await fetch(
      `${API_URL}/api/auth/${authMode}`,
      {
        method: "POST",
        headers:
          getRequestHeaders(true),
        body: JSON.stringify({
          email,
          password: authPassword,
        }),
      }
    );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.message ||
          "Authentication failed."
      );
    }

    if (!data.token) {
      throw new Error(
        "No authentication token was returned."
      );
    }

    /*
     * Store the token first.
     * From this point onward, getRequestHeaders()
     * will send Authorization: Bearer <token>.
     */
    localStorage.setItem(
      TOKEN_KEY,
      data.token
    );

    localStorage.setItem(
      GUEST_MODE_KEY,
      "false"
    );

    /*
     * Update React auth state.
     */
    setAuthenticated(true);
    setUser(data.user);
    setAuthMessage("");
    setAuthScreenOpen(false);
    setGuestPromptOpen(false);
    setAuthEmail("");
    setAuthPassword("");

    /*
     * Move the guest watchlist into the account.
     */
    if (guestId) {
      const migrationResponse =
        await fetch(
          `${API_URL}/api/auth/migrate-guest`,
          {
            method: "POST",
            headers:
              getRequestHeaders(true),
            body: JSON.stringify({
              guestId,
            }),
          }
        );

      const migrationData =
        await migrationResponse.json();

      if (!migrationResponse.ok) {
        throw new Error(
          migrationData.message ||
            "Could not move your guest watchlist into your account."
        );
      }

      console.log(
        "Guest migration result:",
        migrationData
      );
    }

    /*
     * Reload the dashboard ONLY after migration.
     */
    await loadDashboard();

    setToast(
      authMode === "login"
        ? "Welcome back to Nudge."
        : "Your Nudge account is ready."
    );

    setTimeout(() => {
      setToast("");
    }, 2500);
  } catch (error) {
    console.error(
      "Authentication error:",
      error
    );

    setAuthMessage(
      error.message ||
        "Could not complete authentication."
    );
  } finally {
    setAuthLoading(false);
  }
};

  /* =========================================================
     Logout
     ========================================================= */

  const logout = async () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(GUEST_MODE_KEY);

    setAuthenticated(false);
    setUser(null);
    setAuthScreenOpen(true);
    setGuestPromptOpen(false);

    setToast("You have been logged out.");

    setTimeout(() => {
      setToast("");
    }, 2500);
  };

  /* =========================================================
     Add stock
     ========================================================= */

  const addStock = async (
    event
  ) => {
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
      const response =
        await fetch(
          `${API_URL}/api/watchlist`,
          {
            method: "POST",
            headers:
              getRequestHeaders(true),
            body: JSON.stringify({
              ticker:
                cleanTicker,
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

      setWatchlist(
        (previous) => [
          ...previous,
          data,
        ]
      );

      setTicker("");

      localStorage.setItem(
        GUEST_USED_KEY,
        "true"
      );

      await loadDashboard();
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

  /* =========================================================
     Fetch market data
     ========================================================= */

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

        /* Price history */

        try {
          const historyResponse =
            await fetch(
              `${API_URL}/api/market/${stockTicker}/history`,
              {
                headers:
                  getRequestHeaders(),
              }
            );

          const historyData =
            await historyResponse.json();

          if (
            historyResponse.ok
          ) {
            setPriceHistory(
              (previous) => ({
                ...previous,
                [stockTicker]:
                  historyData,
              })
            );
          }
        } catch (
          historyError
        ) {
          console.error(
            "Price history error:",
            historyError
          );
        }

        /* Update personalized view only for authenticated users */

        if (authenticated) {
          try {
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
          } catch (
            viewError
          ) {
            console.error(
              "View update error:",
              viewError
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
        setLoadingTicker(null);
      }
    };

  /* =========================================================
     Refresh all
     ========================================================= */

  const refreshAllStocks =
    async () => {
      if (
        watchlist.length === 0 ||
        refreshingAll
      ) {
        return;
      }

      setRefreshingAll(true);
      setErrorMessage("");

      try {
        for (
          const stock of watchlist
        ) {
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
        setRefreshingAll(false);
      }
    };

  /* =========================================================
     Signal history
     ========================================================= */

  const fetchSignalHistory =
    async (stockTicker) => {
      if (!authenticated) {
  setAuthScreenOpen(
    true
  );

  setAuthMode(
    "login"
  );

  setAuthMessage(
    "Log in to view your signal history."
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

  /* =========================================================
     Feedback
     ========================================================= */

  const sendFeedback = async (
    signalId,
    feedback
  ) => {
    if (!authenticated) {
  setAuthScreenOpen(true);
  setAuthMode("login");
  setAuthMessage(
    "Log in to train your Nudge preferences."
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
              getRequestHeaders(true),
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
            Object.keys(updated).find(
              (stockTicker) =>
                updated[
                  stockTicker
                ]?._id ===
                signalId
            );

          if (tickerToRemove) {
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

  /* =========================================================
     Remove stock
     ========================================================= */

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

  /* =========================================================
     Render
     ========================================================= */

  if (!authReady) {
    return (
      <div className="app">
        <div className="empty-state">
          <div className="empty-icon">✦</div>
          <h3>Loading Nudge</h3>
          <p>Restoring your session...</p>
        </div>
      </div>
    );
  }

if (authScreenOpen && !authenticated) {
  return (
    <div className="auth-page">
      <div className="auth-card">

        <div className="auth-logo">
          <div className="auth-logo-mark">
            N
          </div>

          <span>Nudge</span>
        </div>

        <div className="auth-header">
          <h2>
            {authMode === "login"
              ? "Welcome back"
              : "Create your account"}
          </h2>

          <p>
            {authMode === "login"
              ? "Log in to save your watchlist and personalize Nudge."
              : "Create an account to save your Nudge experience."}
          </p>
        </div>

        <form
          className="auth-form"
          onSubmit={submitAuth}
        >
          <div className="auth-field">
            <label htmlFor="auth-email">
              Email
            </label>

            <input
              id="auth-email"
              type="email"
              placeholder="you@example.com"
              value={authEmail}
              onChange={(event) =>
                setAuthEmail(
                  event.target.value
                )
              }
              autoComplete="email"
            />
          </div>

          <div className="auth-field">
            <label htmlFor="auth-password">
              Password
            </label>

            <input
              id="auth-password"
              type="password"
              placeholder="Enter your password"
              value={authPassword}
              onChange={(event) =>
                setAuthPassword(
                  event.target.value
                )
              }
              autoComplete={
                authMode === "login"
                  ? "current-password"
                  : "new-password"
              }
            />
          </div>

          {authMessage && (
            <div className="auth-error">
              {authMessage}
            </div>
          )}

          <button
            type="submit"
            className="auth-primary-button"
            disabled={authLoading}
          >
            {authLoading
              ? "Please wait..."
              : authMode === "login"
              ? "Log in"
              : "Create account"}
          </button>
        </form>

        <button
          type="button"
          className="auth-secondary-button"
          onClick={() => {
            setAuthMode(
              (previous) =>
                previous === "login"
                  ? "register"
                  : "login"
            );

            setAuthMessage("");
          }}
        >
          {authMode === "login"
            ? "Create an account instead"
            : "I already have an account"}
        </button>

        <div className="auth-divider">
          <span>or</span>
        </div>

        <button
          type="button"
          className="auth-guest-button"
          onClick={() =>
            setGuestPromptOpen(true)
          }
        >
          Continue without logging in
        </button>

        <p className="auth-footer">
          You can use Nudge as a guest anytime.
        </p>
      </div>

      {guestPromptOpen && (
        <div className="guest-overlay">
          <div className="guest-modal">
            <div className="guest-modal-icon">
              N
            </div>

            <h3>
              For a better Nudge experience
            </h3>

            <p>
              Log in to keep your watchlist,
              personalize signals, and save
              your Nudge activity.
            </p>

            <div className="guest-modal-actions">
              <button
                type="button"
                className="auth-guest-button"
                onClick={
                  continueAsGuest
                }
              >
                Continue as guest
              </button>

              <button
                type="button"
                className="auth-primary-button"
                onClick={() => {
                  setGuestPromptOpen(
                    false
                  );

                  setAuthMode("login");
                  setAuthMessage("");
                }}
              >
                Log in
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

  return (
    <div className="app">
      {toast && (
        <div className="toast">
          {toast}
        </div>
      )}

      {/* HEADER */}

      <header className="header">
        <div className="header-top">
          <div className="logo">
            <div className="logo-mark">N</div>

            <div>
              <h1>Nudge</h1>

              <p className="subtitle">
                Track what matters. Know what changed.
              </p>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <div className="market-pill">
              ● Market data
            </div>

            {authenticated ? (
              <>
                <span
                  style={{
                    fontSize: "10px",
                    color: "#77717c",
                    maxWidth: "180px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={user?.email || ""}
                >
                  {user?.email}
                </span>

                <button
                  type="button"
                  className="secondary-action"
                  onClick={logout}
                >
                  Log out
                </button>
              </>
            ) : (
              <button
                type="button"
                className="secondary-action"
                onClick={() => {
                  setAuthMode("login");
                  setAuthMessage("");
                  setAuthScreenOpen(true);
                }}
              >
                Log in
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ADD STOCK */}

      <section className="add-section">
        <form
          onSubmit={addStock}
          className="add-form"
        >
          <input
            type="text"
            placeholder="Enter ticker e.g. RELIANCE"
            value={ticker}
            onChange={(
              event
            ) =>
              setTicker(
                event.target
                  .value
              )
            }
          />

          <button
            type="submit"
          >
            Add Stock
          </button>
        </form>

        {errorMessage && (
          <div className="error-message">
            {errorMessage}
          </div>
        )}
      </section>

      {/* MARKET OVERVIEW */}

      <section className="dashboard-section">
        <div className="section-heading">
          <div>
            <h2>
              Market Overview
            </h2>

            <p>
              A quick look at the broader market.
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
                            maximumFractionDigits:
                              2,
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
                    {market.changePercent !==
                    null
                      ? `${
                          positive
                            ? "+"
                            : ""
                        }${market.changePercent.toFixed(
                          2
                        )}%`
                      : "Data unavailable"}
                  </span>
                </div>
              );
            }
          )}
        </div>
      </section>

      {/* TODAY'S NUDGES */}

      <section className="dashboard-section">
        <div className="section-heading">
          <div>
            <h2>
              Today's Nudges
            </h2>

            <p>
              Things that may deserve your attention.
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
            Nothing meaningful needs your attention right now.
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
                      ?.scrollIntoView(
                        {
                          behavior:
                            "smooth",
                          block:
                            "center",
                        }
                      );
                  }}
                >
                  <div className="nudge-main">
                    <strong>
                      {
                        nudge.ticker
                      }
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
                    {
                      nudge.reason
                    }
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

      {/* WATCHLIST SUMMARY */}

      <section className="dashboard-section">
        <div className="section-heading">
          <div>
            <h2>
              Watchlist Summary
            </h2>

            <p>
              See what changed without the noise.
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
                .total ===
              1
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

      {/* WATCHLIST */}

      <section className="watchlist-section">
        <div className="section-heading">
          <div>
            <h2>
              Your Stocks
            </h2>

            <p>
              Explore the stocks you are following.
            </p>
          </div>

          <span className="stock-count">
            {watchlist.length}{" "}
            {watchlist.length ===
            1
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
              Nothing on your watchlist yet
            </h3>

            <p>
              Add a stock above and Nudge will let you know when something meaningful happens.
            </p>

            <span className="empty-hint">
              No noise. Just useful signals.
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
                          {
                            COMPANY_NAMES[
                              stock.ticker
                            ] ||
                              "Tracked stock"
                          }
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
                        Checking the latest market data...
                      </div>
                    )}

                    {data ? (
                      <div className="market-info">
                        <div className="price-row">
                          <p className="price">
                            ₹
                            {data.price?.toLocaleString(
                              "en-IN",
                              {
                                minimumFractionDigits:
                                  2,
                                maximumFractionDigits:
                                  2,
                              }
                            )}
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
                                {data.changePercent.toFixed(
                                  2
                                )}
                                %
                              </span>
                            )}
                        </div>

                        <p className="volume">
                          Volume:{" "}
                          {data.volume
                            ? data.volume.toLocaleString(
                                "en-IN"
                              )
                            : "—"}
                        </p>

                        {data.stale && (
                          <div className="stock-status stale-status">
                            Data may be delayed. Showing the last available price.
                          </div>
                        )}

                        {data.unavailable && (
                          <div className="stock-status unavailable-status">
                            Market data is temporarily unavailable.
                          </div>
                        )}

                        {data.hasEnoughHistory ===
                          false && (
                          <div className="stock-status history-status">
                            Not enough history yet to detect meaningful changes.
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
                          Market data hasn't been checked yet.
                        </p>

                        <p>
                          Check the market to see what changed.
                        </p>
                      </div>
                    )}

                    {/* SIGNAL */}

                    {data && (
                      <div className="signal-wrapper">
                        {signal ? (
                          <div
                            className={`signal signal-${signal.urgency?.toLowerCase()}`}
                          >
                            <div className="signal-top">
                              <div>
                                <span className="signal-label">
                                  Worth a closer look
                                </span>

                                <h4>
                                  Something unusual happened
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
                                Was this useful?
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
                        ) : (
                          <div className="signal signal-calm">
                            <p>
                              ○ Nothing meaningful since you last checked.
                            </p>
                          </div>
                        )}
                      </div>
                    )}

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
                            No previous meaningful signals.
                          </p>
                        ) : (
                          signalHistory[
                            stock.ticker
                          ].map(
                            (
                              event
                            ) => (
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
                          if (!authenticated) {
  setAuthScreenOpen(true);
  setAuthMode("login");
  setAuthMessage(
    "Log in to view your signal history."
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
                              [stock.ticker]:
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
                  </div>
                );
              }
            )}
          </div>
        )}
      </section>

      {/* ACTIVITY */}

      {authenticated && (
        <section className="dashboard-section activity-section">
          <div className="section-heading">
            <div>
              <h2>Your Activity</h2>

              <p>
                A simple record of what you have done in Nudge.
              </p>
            </div>

            <span className="stock-count">
              {activity.length}{" "}
              {activity.length === 1
                ? "activity"
                : "activities"}
            </span>
          </div>

          {activity.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                ✦
              </div>

              <h3>
                No activity yet
              </h3>

              <p>
                Your Nudge actions will appear here as you use the app.
              </p>

              <span className="empty-hint">
                Add a stock, check the market, or give feedback to get started.
              </span>
            </div>
          ) : (
            <div className="nudge-list">
              {activity.map((item) => (
                <div
                  className="nudge-card"
                  key={item._id}
                >
                  <div>
                    <strong>
                      {item.message}
                    </strong>

                    {item.ticker && (
                      <p>
                        {item.ticker}
                      </p>
                    )}
                  </div>

                  <small>
                    {new Date(
                      item.createdAt
                    ).toLocaleString()}
                  </small>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

    </div>
  );
}

export default App;