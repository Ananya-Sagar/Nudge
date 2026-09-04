# Nudge

> Track what matters. Know what changed.

Nudge is a smart market watchlist designed to help users understand what has meaningfully changed in the stocks they follow.

Instead of treating every price movement as important, Nudge analyzes market behavior, identifies unusual movements, and surfaces only the events that are relevant enough to deserve attention.

Nudge is built around two principles:

- **Personalized Signal** — what matters adapts to the individual user.
- **Honest Urgency** — Nudge never creates urgency when nothing meaningful has happened.

> **The market decides what happened. The user decides what matters.**


## Problem

Traditional stock watchlists provide prices, percentage changes, and other market information, but they often leave users to determine whether a movement is actually significant.

This creates two problems:

1. Meaningful market events can be difficult to distinguish from normal market noise.
2. Constant alerts and updates can create unnecessary urgency and information overload.

The challenge is not simply displaying more market information.

The challenge is deciding:

> **What actually changed, and does it deserve this user's attention?**


## Solution

Nudge separates **objective market significance** from **personal relevance**.

First, the system analyzes market data using historical price behavior and trading volume to determine whether a movement is unusual.

Then, the resulting signal is passed through a personalization layer based on the user's interaction history.

This means:

- The underlying market event remains objective.
- Different users can receive different signals based on their interests.
- User feedback gradually changes what Nudge considers worth surfacing.
- Normal market fluctuations do not automatically become alerts.


## Key Features

- Create and manage a personal stock watchlist
- Validate stock tickers before adding them
- Prevent duplicate watchlist entries
- Retrieve latest market information
- Store historical price and volume snapshots
- Display historical price movement through interactive charts
- Detect unusual price movements using volatility-adjusted analysis
- Confirm unusual price movements using trading volume
- Personalize signal surfacing using user feedback
- View meaningful signal history
- Provide Useful / Not for me feedback
- Show a calm state when nothing meaningful has changed
- Detect stale or unavailable market data
- Fall back to previously stored market data when live data is unavailable
- Responsive web interface



## How Nudge Works


                 Market Data
                      |
                      v
          Historical Price & Volume
                      |
                      v
               Signal Engine
                      |
                      v
         Objective Market Signal
                      |
                      v
              User Preference
                      |
                      v
          Personalized Relevance
                      |
                      v
             Signal Surfacing
                      |
          +-----------+-----------+
          |                       |
          v                       v
     Meaningful              Nothing Meaningful
       Signal                 Since Last Check


## What Makes Nudge Different?

Most watchlists are designed to show users as much market information as possible.

Nudge takes the opposite approach.

Instead of asking:

> "What changed in the market?"

Nudge asks:

> **"What meaningfully changed, and does it deserve this user's attention?"**

### 1. It does not treat every movement as important

A normal watchlist may highlight a stock simply because its price moved by a fixed percentage.

Nudge compares the movement against the stock's historical behavior using volatility-adjusted analysis.

This helps distinguish unusual movements from normal fluctuations.

### 2. Price movement alone is not enough

Nudge requires confirmation from multiple factors.

An unusual price movement combined with elevated trading volume is treated as stronger evidence than either indicator alone.

This reduces false signals.

### 3. The signal is personalized

The underlying market event remains objective.

What changes is whether that event is important enough to surface for a particular user.

User interaction creates a feedback loop:

```text
Signal
  ↓
Useful / Not for me
  ↓
User Preference
  ↓
Personalized Relevance
  ↓
Future Signal Surfacing