const mongoose = require("mongoose");

const watchlistItemSchema = new mongoose.Schema(
  {
    /*
     * Logged-in user:
     * MongoDB User _id is stored here.
     *
     * Guest user:
     * We will store a generated guest ID as a string.
     *
     * Keeping this as String lets one model support
     * both account users and temporary guest sessions.
     */
    userId: {
      type: String,
      required: true,
      trim: true,
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
  {
    userId: 1,
    ticker: 1,
  },
  {
    unique: true,
  }
);

module.exports = mongoose.model(
  "WatchlistItem",
  watchlistItemSchema
);