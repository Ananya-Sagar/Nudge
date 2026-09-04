const mongoose = require("mongoose");

const userFeedbackSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    signalEventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SignalEvent",
      required: true,
    },

    ticker: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },

    feedback: {
      type: String,
      enum: ["useful", "not_for_me"],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

userFeedbackSchema.index(
  {
    userId: 1,
    signalEventId: 1,
  },
  {
    unique: true,
  }
);

module.exports = mongoose.model(
  "UserFeedback",
  userFeedbackSchema
);