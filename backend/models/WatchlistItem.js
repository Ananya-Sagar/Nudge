const mongoose = require("mongoose");

const watchlistItemSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
    },

    ticker: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },

    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

watchlistItemSchema.index(
  { userId: 1, ticker: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  "WatchlistItem",
  watchlistItemSchema
);
