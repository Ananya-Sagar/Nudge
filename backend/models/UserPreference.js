const mongoose = require("mongoose");

const userPreferenceSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
    },

    priceMoveWeight: {
      type: Number,
      default: 0.5,
      min: 0,
      max: 1,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "UserPreference",
  userPreferenceSchema
);