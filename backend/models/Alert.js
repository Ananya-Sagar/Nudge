const mongoose = require("mongoose");

const alertSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    ticker: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },

    condition: {
      type: String,
      enum: ["above", "below"],
      required: true,
    },

    targetPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    active: {
      type: Boolean,
      default: true,
    },

    triggeredAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

alertSchema.index({
  userId: 1,
  active: 1,
});

module.exports = mongoose.model("Alert", alertSchema);