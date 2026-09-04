import { useEffect, useState } from "react";
import "./App.css";

const USER_ID_KEY = "market_watch_user_id";

const getUserId = () => {
  let userId = localStorage.getItem(USER_ID_KEY);

  if (!userId) {
    userId = crypto.randomUUID();
    localStorage.setItem(USER_ID_KEY, userId);
  }

  return userId;
};

function PriceChart({ data }) {
  const [hoveredPoint, setHoveredPoint] = useState(null);

  if (!data || data.length < 2) {
    return (
      <div className="chart-placeholder">
        Not enough price history yet
      </div>
    );
  }

const width = 620;
const height = 140;

const paddingLeft = 38;
const paddingRight = 12;
const paddingTop = 10;
const paddingBottom = 22;

  const prices = data.map((point) => Number(point.price));

  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice || 1;

  const isIncreasing =
    prices[prices.length - 1] >= prices[0];

    const overallChange =
  ((prices[prices.length - 1] - prices[0]) /
    prices[0]) *
  100;

  const chartColor = isIncreasing
    ? "#2f8f5b"
    : "#c94f4f";

  const gradientId = isIncreasing
    ? "greenGradient"
    : "redGradient";

  const getX = (index) =>
    paddingLeft +
    (index / (data.length - 1)) *
      (width - paddingLeft - paddingRight);

  const getY = (price) =>
    paddingTop +
    (1 - (price - minPrice) / priceRange) *
      (height - paddingTop - paddingBottom);

  const points = data
    .map((point, index) => {
      return `${getX(index)},${getY(
        Number(point.price)
      )}`;
    })
    .join(" ");

  const areaPoints = [
    `${getX(0)},${height - paddingBottom}`,
    points,
    `${getX(data.length - 1)},${height - paddingBottom}`,
  ].join(" ");

  const latestIndex = data.length - 1;
  const latestPoint = data[latestIndex];

  const latestX = getX(latestIndex);
  const latestY = getY(
    Number(latestPoint.price)
  );

 const yLabels = [
  maxPrice,
  minPrice + priceRange / 2,
  minPrice,
];

const dateIndexes = [
  0,
  Math.floor((data.length - 1) / 2),
  data.length - 1,
];

  return (
    <div className="chart-container">

      {/* Chart heading */}

      <div className="chart-header">
  <div>
    <span className="chart-label">
      Price movement
    </span>

    <span
      className="chart-trend"
      style={{ color: chartColor }}
    >
      {overallChange >= 0 ? "+" : ""}
      {overallChange.toFixed(2)}%
    </span>
  </div>

  <span className="chart-period">
    35 days
  </span>
</div>

      {/* Chart */}

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

          {[0, 1, 2].map((index) => {

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
                x2={width - paddingRight}
                y2={y}
                className="chart-grid-line"
              />
            );

          })}


          {/* Shaded area */}

          <polygon
            points={areaPoints}
            fill={`url(#${gradientId})`}
          />


          {/* Main line */}

          <polyline
            points={points}
            fill="none"
            stroke={chartColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />


          {/* Data points */}

{data.map((point, index) => {
  const x = getX(index);
  const y = getY(Number(point.price));

  return (
    <circle
      key={index}
      cx={x}
      cy={y}
      r={hoveredPoint?.index === index ? 4 : 2.5}
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
      onMouseLeave={() => setHoveredPoint(null)}
    />
  );
})}

{hoveredPoint && (
  <g
    transform={`translate(
      ${Math.max(
        8,
        Math.min(hoveredPoint.x - 50, width - 108)
      )}
      ${Math.max(
        5,
        hoveredPoint.y - 48
      )}
    )`}
    pointerEvents="none"
  >
    <rect
      width="100"
      height="36"
      rx="8"
      className="hover-tooltip-box"
    />

    <text
      x="50"
      y="14"
      textAnchor="middle"
      className="hover-tooltip-price"
    >
      ₹{Number(hoveredPoint.price).toFixed(2)}
    </text>

    <text
      x="50"
      y="28"
      textAnchor="middle"
      className="hover-tooltip-date"
    >
      {new Date(hoveredPoint.date).toLocaleDateString(
        "en-IN",
        {
          month: "short",
          day: "numeric",
        }
      )}
    </text>
  </g>
)}


          {/* Current price bubble */}

          <g
            transform={`translate(
              ${Math.max(
                5,
                Math.min(
                  latestX - 47,
                  width - 105
                )
              )}
              ${Math.max(
                5,
                latestY - 34
              )}
            )`}
          >

            <rect
              width="94"
              height="25"
              rx="7"
              fill={chartColor}
            />

            <text
              x="47"
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
                  48,
                  Math.min(
                    hoveredPoint.x - 55,
                    width - 62
                  )
                )}
                ${Math.max(
                  5,
                  hoveredPoint.y - 48
                )}
              )`}
            >

              <rect
                width="110"
                height="35"
                rx="7"
                className="hover-tooltip-box"
              />

              <text
                x="55"
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
                x="55"
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


          {/* Y-axis labels */}

          {yLabels.map(
            (price, index) => {

              const y =
                paddingTop +
                (index / 3) *
                  (height -
                    paddingTop -
                    paddingBottom);

              return (
                <text
                  key={index}
                  x="3"
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


          {/* X-axis dates */}

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

function App() {
  const [watchlist, setWatchlist] = useState([]);
  const [ticker, setTicker] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [marketData, setMarketData] = useState({});
  const [signals, setSignals] = useState({});
  const [signalHistory, setSignalHistory] = useState({});
  const [showHistory, setShowHistory] = useState({});
  const [priceHistory, setPriceHistory] = useState({});
  const [loadingTicker, setLoadingTicker] = useState(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    fetch("http://localhost:5000/api/watchlist", {
      headers: {
        "Content-Type": "application/json",
        "X-User-Id": getUserId(),
      },
    })
      .then((response) => response.json())
      .then((data) => {
        setWatchlist(data);
      })
      .catch((error) => {
        console.error("Error fetching watchlist:", error);
        setErrorMessage("Could not load your watchlist.");
      });
  }, []);

  const addStock = async (event) => {
    event.preventDefault();

    setErrorMessage("");

    if (!ticker.trim()) {
      setErrorMessage("Please enter a stock ticker.");
      return;
    }

    try {
      const response = await fetch(
        "http://localhost:5000/api/watchlist",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-User-Id": getUserId(),
          },
          body: JSON.stringify({
            ticker: ticker.trim().toUpperCase(),
          }),
        }
      );

      const data = await response.json();

      console.log("ADD STOCK RESPONSE:", response.status, data);

      if (!response.ok) {
        setErrorMessage(
          data.message || "Could not add this stock."
        );
        return;
      }

      setWatchlist((previousWatchlist) => [
        ...previousWatchlist,
        data,
      ]);

      setTicker("");
    } catch (error) {
      console.error("ADD STOCK ERROR:", error);

      setErrorMessage(
        "Could not connect to the market service. Please try again."
      );
    }
  };

  const fetchMarketData = async (ticker) => {
    setLoadingTicker(ticker);
    setErrorMessage("");


    try {
      const response = await fetch(
        `http://localhost:5000/api/market/${ticker}`,
        {
          headers: {
            "X-User-Id": getUserId(),
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.message || "Could not fetch market data.");
        return;
      }

      setMarketData((previousData) => ({
        ...previousData,
        [ticker]: data,
      }));

      const historyResponse = await fetch(
  `http://localhost:5000/api/market/${ticker}/history`,
  {
    headers: {
      "X-User-Id": getUserId(),
    },
  }
);

const historyData = await historyResponse.json();

if (historyResponse.ok) {
  setPriceHistory((previousHistory) => ({
    ...previousHistory,
    [ticker]: historyData,
  }));
}

      const viewResponse = await fetch(
        `http://localhost:5000/api/market/${ticker}/view`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-User-Id": getUserId(),
          },
        }
      );

      const viewData = await viewResponse.json();

      setSignals((previousSignals) => ({
        ...previousSignals,
        [ticker]: viewData.signalEvent,
      }));
    } catch (error) {
      console.error("Error fetching market data:", error);

      setErrorMessage(
        "Unable to fetch market data right now."
      );
    } finally {
      setLoadingTicker(null);
    }
  };

    const refreshAllStocks = async () => {
  if (watchlist.length === 0) {
    return;
  }

  for (const stock of watchlist) {
    await fetchMarketData(stock.ticker);
  }
};

  const fetchSignalHistory = async (ticker) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/signals/${ticker}/history`,
        {
          headers: {
            "X-User-Id": getUserId(),
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error(data.message);
        return;
      }

      setSignalHistory((previousHistory) => ({
        ...previousHistory,
        [ticker]: data,
      }));
    } catch (error) {
      console.error(
        "Error fetching signal history:",
        error
      );
    }
  };

  const sendFeedback = async (signalId, feedback) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/signals/${signalId}/feedback`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-User-Id": getUserId(),
          },
          body: JSON.stringify({
            feedback,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error(data.message);
        return;
      }

      console.log("FEEDBACK:", data);

      setSignals((previousSignals) => {
        const updatedSignals = {
          ...previousSignals,
        };

        const tickerToRemove = Object.keys(updatedSignals).find(
          (ticker) => updatedSignals[ticker]?._id === signalId
        );

        if (tickerToRemove) {
          delete updatedSignals[tickerToRemove];
        }

        return updatedSignals;
      });

      setToast(
  feedback === "useful"
    ? "Thanks — Nudge will use this feedback."
    : "Got it — we'll show fewer signals like this."
);

setTimeout(() => {
  setToast("");
}, 2500);

    } catch (error) {
      console.error(
        "Error sending feedback:",
        error
      );
    }
  };

  

  const removeStock = async (id) => {
    const confirmed = window.confirm(
  "Remove this stock from your watchlist?"
);

if (!confirmed) {
  return;
}
    try {
      const response = await fetch(
        `http://localhost:5000/api/watchlist/${id}`,
        {
          method: "DELETE",
          headers: {
            "X-User-Id": getUserId(),
          },
        }
      );

      if (!response.ok) {
        const data = await response.json();

        setErrorMessage(
          data.message || "Could not remove stock."
        );

        return;
      }

      setWatchlist((previousWatchlist) =>
        previousWatchlist.filter(
          (stock) => stock._id !== id
        )
      );
    } catch (error) {
      console.error("Error removing stock:", error);

      setErrorMessage(
        "Could not remove this stock."
      );
    }
  };

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
            <div className="logo-mark">
  N
</div>

            <div>
              <h1>Nudge</h1>

              <p className="subtitle">
                Track what matters. Know what changed.
              </p>
            </div>
          </div>

          <div className="market-pill">
            ● Market data
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
            onChange={(event) =>
              setTicker(event.target.value)
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


      {/* WATCHLIST */}

      <section className="watchlist-section">

        <div className="section-heading">

          <div>
            <h2>Your Watchlist</h2>

            <p>
              See what changed without the noise.
            </p>
          </div>

          <div className="watchlist-tools">
  <span className="stock-count">
    {watchlist.length}{" "}
    {watchlist.length === 1
      ? "stock"
      : "stocks"}
  </span>

  <button
    className="refresh-all-button"
    onClick={refreshAllStocks}
  >
    Refresh all
  </button>
</div>

        </div>


        {watchlist.length === 0 ? (

          <div className="empty-state">
  <div className="empty-icon">✦</div>

  <h3>Nothing on your watchlist yet</h3>

  <p>
    Add a stock above and Nudge will let you know
    when something meaningful happens.
  </p>

  <span className="empty-hint">
    No noise. Just useful signals.
  </span>
</div>

        ) : (

          <div className="watchlist">

            {watchlist.map((stock) => {

              const data =
                marketData[stock.ticker];

              const signal =
                signals[stock.ticker];

              const change =
                data?.changePercent ?? 0;

              return (

                <div
                  className="stock-card"
                  key={stock._id}
                >

                  {/* STOCK HEADER */}

                  <div className="stock-header">

                    <div>

                      <h3 className="stock-name">
  {stock.ticker}
</h3>

<p className="stock-subtitle">
  {COMPANY_NAMES[stock.ticker] || "Tracked stock"}
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
                  {loadingTicker === stock.ticker && (
  <div className="loading-message">
    Checking the latest market data...
  </div>
)}
                  {data ? (

                    <div className="market-info">

                      <div className="price-row">

                        <span className="price">
                          ₹
                          {Number(
                            data.price
                          ).toLocaleString(
                            "en-IN",
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            }
                          )}
                        </span>

                        <span
                          className={`change ${
                            change >= 0
                              ? "positive"
                              : "negative"
                          }`}
                        >
                          {change >= 0
                            ? "+"
                            : ""}
                          {change.toFixed(2)}%
                        </span>

                      </div>

                      <p className="volume">
  Volume {data.volume?.toLocaleString("en-IN")}
</p>

                      <PriceChart data={priceHistory[stock.ticker]}/>
                      {data.stale && (
                        <div className="stale-warning">
                          ⚠ Data may be delayed.
                          Showing the last available
                          price.
                        </div>
                      )}

                    </div>

                  ) : (

                    <div className="no-data">
                      <p>
                        Market data hasn't been
                        checked yet.
                      </p>

                      <p>
                        Check the market to see
                        what changed.
                      </p>
                    </div>

                  )}


                  {/* SIGNAL */}

                  {data && (

                    <div
                      className={
                        signal
                          ? "signal"
                          : "signal signal-calm"
                      }
                    >

                      {signal ? (
  <div className={`signal signal-${signal.urgency?.toLowerCase()}`}>

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
        {signal.urgency}
      </span>
    </div>

    <p className="signal-reason">
      {signal.reason}
    </p>

    <div className="signal-evidence">

      <div>
        <span>Movement</span>
        <strong>
          {Number(signal.magnitude).toFixed(2)}%
        </strong>
      </div>

      {signal.zScore !== undefined && (
        <div>
          <span>Unusualness</span>
          <strong>
            {Number(signal.zScore).toFixed(2)}σ
          </strong>
        </div>
      )}

      {signal.volumeRatio !== undefined && (
        <div>
          <span>Volume</span>
          <strong>
            {Number(signal.volumeRatio).toFixed(2)}×
          </strong>
        </div>
      )}

    </div>

    <div className="feedback">

      <span>Was this useful?</span>

      <button
        onClick={() =>
          sendFeedback(signal._id, "useful")
        }
      >
        Useful
      </button>

      <button
        onClick={() =>
          sendFeedback(signal._id, "not_for_me")
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

                  {signalHistory[
                    stock.ticker
                  ] && (

                    <div className="history">

                      <h4>
                        Signal History
                      </h4>

                      {showHistory[stock.ticker] &&
  signalHistory[stock.ticker] && (
    <div className="history">
      <h4>Signal History</h4>

      {signalHistory[stock.ticker].length === 0 ? (
        <p>No previous meaningful signals.</p>
      ) : (
        signalHistory[stock.ticker].map((event) => (
          <div
            className="history-item"
            key={event._id}
          >
            <strong>{event.ticker}</strong>

            <p>{event.reason}</p>

            <small>
              {new Date(
                event.createdAt
              ).toLocaleString()}
            </small>
          </div>
        ))
      )}
    </div>
  )}

                    </div>

                  )}

{/* ACTIONS */}

<div className="actions">

  <button
    className="primary-action"
    onClick={() =>
      fetchMarketData(stock.ticker)
    }
    disabled={
      loadingTicker === stock.ticker
    }
  >
    {loadingTicker === stock.ticker
      ? "Checking..."
      : "Check Market"}
  </button>

  <button
    className="secondary-action"
    onClick={() => {
      if (!signalHistory[stock.ticker]) {
        fetchSignalHistory(stock.ticker);
      }

      setShowHistory((previous) => ({
        ...previous,
        [stock.ticker]: !previous[stock.ticker],
      }));
    }}
  >
    {showHistory[stock.ticker]
      ? "Hide History"
      : "View History"}
  </button>

  <button
    className="remove-action"
    onClick={() =>
      removeStock(stock._id)
    }
  >
    Remove
  </button>

</div>

</div>
              
);

})}

</div>

)}

</section>

</div>
);
}

export default App;