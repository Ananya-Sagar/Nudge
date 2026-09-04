const mongoose = require("mongoose");

const userViewStateSchema = new mongoose.Schema(
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

    lastSeenPrice: {
      type: Number,
      required: true,
    },

    lastSeenAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

userViewStateSchema.index(
  { userId: 1, ticker: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  "UserViewState",
  userViewStateSchema
);