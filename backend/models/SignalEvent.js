const mongoose = require("mongoose");

const signalEventSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
    },

    ticker: {
      type: String,
      required: true,
      uppercase: true,
    },

    signalType: {
      type: String,
      required: true,
    },

    magnitude: {
      type: Number,
      required: true,
    },

    reason: {
      type: String,
      required: true,
    },

    shownToUser: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

signalEventSchema.index(
  { userId: 1, ticker: 1, createdAt: -1 }
);

module.exports = mongoose.model(
  "SignalEvent",
  signalEventSchema
);