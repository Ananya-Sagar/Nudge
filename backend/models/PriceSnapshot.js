const mongoose = require("mongoose");

const priceSnapshotSchema = new mongoose.Schema(
  {
    ticker: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },

    price: {
      type: Number,
      required: true,
    },

    volume: {
      type: Number,
      required: true,
      default: 0,
    },

    capturedAt: {
      type: Date,
      default: Date.now,
    },

    sourceLagSeconds: {
      type: Number,
      default: 0,
    },

    source: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

priceSnapshotSchema.index({
  ticker: 1,
  capturedAt: -1,
});

module.exports = mongoose.model(
  "PriceSnapshot",
  priceSnapshotSchema
);