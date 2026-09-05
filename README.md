# Nudge

> **Track what matters. Know what changed.**

Nudge is a smart market watchlist designed to help users understand **what has meaningfully changed** in the stocks they follow.

Instead of treating every price movement as important, Nudge analyzes market behavior, compares movements against historical behavior, considers trading volume, and surfaces signals that are significant enough to deserve attention.

Nudge is built around two principles:

- **Personalized Signal** — what matters adapts to the individual user.
- **Honest Urgency** — Nudge does not create urgency when nothing meaningful has happened.

> **The market decides what happened. The user decides what matters.**

---

## Problem

Traditional stock watchlists provide prices, percentage changes, and market information, but they often leave users to determine whether a movement is actually significant.

This creates two major problems:

1. Meaningful market events can be difficult to distinguish from normal market noise.
2. Constant market updates can create unnecessary urgency and information overload.

The challenge is therefore not simply displaying more market information.

The real question is:

> **What actually changed, and does it deserve this user's attention?**

---

## Solution

Nudge separates **objective market significance** from **personal relevance**.

When a user checks a stock, Nudge analyzes available market information and historical behavior to determine whether the movement is unusual.

It then considers supporting evidence such as trading volume before deciding how strong the signal should be.

For authenticated users, feedback from previous interactions influences future signal relevance.

The overall process is:

```text
Market Data
     ↓
Objective Significance
     ↓
Personal Relevance
     ↓
Nudge

This allows Nudge to:

distinguish unusual movement from normal volatility
combine multiple sources of evidence
personalize signal relevance
explain why a signal appeared
avoid creating urgency when nothing meaningful has changed
Key Features
Smart Watchlist

Nudge allows users to maintain a personalized list of stocks they want to follow.

Features include:

Add stocks to a watchlist
Remove stocks from a watchlist
Validate supported stock tickers
Prevent duplicate entries
Support both guest and authenticated watchlists
Market Analysis

Nudge analyzes available market information rather than simply displaying a stock price.

The system considers:

Current price
Percentage movement
Trading volume
Historical price behavior
Historical volatility

This provides context for deciding whether a market movement is actually unusual.

Personalized Signals

Nudge does not treat every market movement as equally important.

Signals are generated using multiple factors, including:

price movement
historical volatility
trading volume
agreement between independent indicators

A stronger signal can occur when multiple pieces of evidence point in the same direction.

Users can also provide feedback:

Useful
Not for me

This feedback influences future signal relevance.

New users begin from a neutral preference state, allowing the system to gradually adapt as interaction data becomes available.

Signal Explanations

A signal should not simply say:

"Something happened."

Nudge attempts to explain why a stock was surfaced.

The interface can provide supporting evidence such as:

unusual price movement
comparison against historical behavior
volume confirmation
signal strength

This makes the system more transparent and easier to understand.

Historical Context

Nudge includes historical market information so users can understand whether a movement is actually unusual.

The dashboard includes an interactive price chart that provides additional context around the stock's previous behavior.

Historical data also supports the signal engine by providing a reference point for determining unusual movement.

Honest Urgency

One of Nudge's key product decisions is that not every market movement deserves attention.

When nothing meaningful has happened, the application can communicate a calm state instead of generating unnecessary urgency.

For example:

○ Nothing meaningful since you last checked.

This is intentionally different from products that attempt to maximize engagement by constantly notifying users about every small change.

Nudge focuses on attention quality rather than notification volume.

How Nudge Works
                    Market Data
                         |
                         v
              Historical Price & Volume
                         |
                         v
                  Signal Engine
                         |
             +-----------+-----------+
             |                       |
             v                       v
       Price Behavior          Volume Evidence
             |                       |
             +-----------+-----------+
                         |
                         v
              Objective Significance
                         |
                         v
                 User Preference
                         |
                         v
              Personalized Relevance
                         |
                         v
                      Nudge
                         |
              +----------+----------+
              |                     |
              v                     v
        Meaningful Signal     Nothing Meaningful
                                Changed
Signal Detection

Nudge does not rely only on a fixed percentage threshold.

A movement can be meaningful when it is unusual compared with the stock's own historical behavior.

The system uses volatility-adjusted analysis to determine whether the current movement is outside the range of what would normally be expected.

Trading volume is then used as supporting evidence.

Conceptually:

Current Movement
       ↓
Historical Volatility
       ↓
How unusual is the movement?
       ↓
Volume Confirmation
       ↓
Signal Strength

A large price movement supported by unusual volume provides stronger evidence than looking at price movement alone.

This helps reduce false positives caused by normal market fluctuations.

Personalization

Nudge separates two different questions:

What happened?

This is determined from market data.

Should this user care?

This is determined using personalization.

The feedback loop is:

Market Signal
      ↓
User Feedback
      ↓
Useful / Not for me
      ↓
User Preference
      ↓
Future Signal Relevance

A new user begins with a neutral preference.

As the user interacts with the system, their feedback influences future signal relevance.

This means two users can potentially receive different levels of attention for similar types of market events.

What Makes Nudge Different?

Most traditional watchlists are designed around:

"Show me what changed."

Nudge is designed around:

"Show me what meaningfully changed, and help me decide whether it matters."

1. It does not treat every movement as important

A fixed percentage threshold does not account for how a particular stock normally behaves.

Nudge uses historical behavior to provide context.

2. Multiple factors support signal strength

Price movement alone can create noisy signals.

Nudge combines movement analysis with additional evidence such as volume.

3. Personal relevance is separate from market significance

The market event itself is not changed based on user preference.

Instead, personalization determines whether that event deserves greater attention for that particular user.

4. Nudge can say "nothing happened"

A financial application does not always need to create urgency.

Sometimes the most useful result is simply:

Nothing meaningful changed.

Authentication

Nudge supports both authenticated users and guest users.

Authentication uses JWT-based sessions.

Authenticated users can maintain persistent application data and access personalized functionality.

The login flow allows users to:

Log in
Create an account
Continue without logging in
Return to the dashboard as a guest
Guest Mode

Users do not have to create an account before exploring Nudge.

The flow is:

Open Nudge
    ↓
Continue without logging in
    ↓
Continue as guest
    ↓
Use Nudge

Guest functionality allows users to experience the main watchlist and market-analysis features before deciding whether they want a persistent account.

Guest-to-Account Migration

A guest user can later create or enter an account.

Instead of losing their existing watchlist, Nudge can migrate the guest watchlist to the authenticated account.

Guest Watchlist
      ↓
Login / Registration
      ↓
Guest Migration
      ↓
Authenticated Account
      ↓
Persistent User Data

This creates a smoother transition between exploration and long-term use.

Activity History

Authenticated users can view their activity inside Nudge.

This provides a record of meaningful actions performed within the application and gives users continuity between sessions.

Examples of tracked activity include actions related to:

watchlist changes
market checks
feedback
account activity
Resilience and Edge Cases

Nudge is designed with the assumption that external market-data services can sometimes fail.

Stale Market Data

If fresh market information cannot be retrieved, Nudge can use previously stored market observations instead of displaying fabricated values.

The UI distinguishes delayed or stale information so that the user understands the data may not be current.

Insufficient Historical Data

Signal detection depends on historical context.

When insufficient historical data exists, Nudge avoids pretending that a strong meaningful signal can be determined.

Invalid Tickers

Unsupported stock identifiers are rejected instead of being treated as valid market data.

Duplicate Watchlist Entries

The backend prevents duplicate watchlist entries for the same user or guest.

Authentication Failure

Invalid or expired authentication tokens are cleared so the application can safely return the user to a guest state.

Technical Architecture
                         ┌─────────────────────┐
                         │     React + Vite     │
                         │      Frontend        │
                         └──────────┬──────────┘
                                    │
                                REST API
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │    Node + Express    │
                         │       Backend        │
                         └───────┬───────┬─────┘
                                 │       │
                    ┌────────────┘       └────────────┐
                    ▼                                 ▼
            ┌───────────────┐                 ┌───────────────┐
            │    MongoDB    │                 │ Market Data   │
            │    Database   │                 │    Source     │
            └───────────────┘                 └───────────────┘

                         Backend Processing
                                │
                                ▼
                         ┌───────────────┐
                         │ Signal Engine │
                         └───────┬───────┘
                                 │
                                 ▼
                         ┌────────────────┐
                         │ Personalization│
                         └───────┬────────┘
                                 │
                                 ▼
                              Nudge
Technology Stack
Frontend
React
Vite
JavaScript
CSS
SVG-based interactive price charts
Backend
Node.js
Express.js
REST APIs
JWT authentication
bcryptjs
Database
MongoDB
Mongoose
Market Data
Yahoo Finance data source
Stored historical market snapshots
Deployment
Render
GitHub
Main Data Models

Nudge uses MongoDB to persist core application state.

User

Stores authentication and account information.

WatchlistItem

Stores stocks associated with a user or guest.

PriceSnapshot

Stores historical market observations.

SignalEvent

Stores detected meaningful market events.

UserFeedback

Stores user responses such as:

Useful
Not for me
UserPreference

Stores personalized relevance information.

Activity

Stores authenticated user activity history.