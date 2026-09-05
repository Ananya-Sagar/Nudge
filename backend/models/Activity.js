const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    type: {
      type: String,
      enum: [
        "watchlist_added",
        "watchlist_removed",
        "market_checked",
        "alert_created",
        "alert_removed",
        "alert_triggered",
        "feedback_given",
        "login",
      ],
      required: true,
    },

    ticker: {
      type: String,
      uppercase: true,
      trim: true,
      default: null,
    },

    message: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

activitySchema.index({
  userId: 1,
  createdAt: -1,
});

module.exports = mongoose.model(
  "Activity",
  activitySchema
);
