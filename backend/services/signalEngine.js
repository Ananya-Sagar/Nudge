const calculateReturns = (prices) => {
  const returns = [];

  for (let i = 1; i < prices.length; i++) {
    const previousPrice = prices[i - 1];
    const currentPrice = prices[i];

    if (previousPrice <= 0) {
      continue;
    }

    const returnPercent =
      ((currentPrice - previousPrice) / previousPrice) * 100;

    returns.push(returnPercent);
  }

  return returns;
};

const calculateMean = (values) => {
  if (values.length === 0) {
    return 0;
  }

  const total = values.reduce(
    (sum, value) => sum + value,
    0
  );

  return total / values.length;
};

const calculateStandardDeviation = (values) => {
  if (values.length < 2) {
    return 0;
  }

  const mean = calculateMean(values);

  const squaredDifferences = values.map(
    (value) => (value - mean) ** 2
  );

  const variance = calculateMean(squaredDifferences);

  return Math.sqrt(variance);
};

const calculateAverage = (values) => {
  if (values.length === 0) {
    return 0;
  }

  const total = values.reduce(
    (sum, value) => sum + value,
    0
  );

  return total / values.length;
};


const calculateZScore = (currentReturn, historicalReturns) => {
  const mean = calculateMean(historicalReturns);
  const standardDeviation =
    calculateStandardDeviation(historicalReturns);

  if (standardDeviation === 0) {
    return 0;
  }

  return (currentReturn - mean) / standardDeviation;
};

const calculateSignal = ({
  currentReturn,
  historicalReturns,
  currentVolume,
  historicalVolumes,
}) => {
  // We need enough history before making a decision.
  if (
    historicalReturns.length < 20 ||
    historicalVolumes.length < 20
  ) {
    return {
      signalScore: 0,
      urgency: "Low",
      reason:
        "Not enough history to determine a meaningful change.",
      zScore: 0,
      volumeRatio: 0,
    };
  }

  const standardDeviation =
    calculateStandardDeviation(historicalReturns);

  // Avoid unrealistic z-scores caused by extremely
  // small historical volatility.
  if (standardDeviation < 0.05) {
    return {
      signalScore: 0,
      urgency: "Low",
      reason:
        "Recent price movement is too stable to confidently identify an unusual change.",
      zScore: 0,
      volumeRatio: 0,
    };
  }

  const zScore = calculateZScore(
    currentReturn,
    historicalReturns
  );

  const absoluteZScore = Math.abs(zScore);

  // Calculate how today's volume compares
  // with the historical average.
  const averageVolume =
    calculateAverage(historicalVolumes);

  const volumeRatio =
    averageVolume > 0
      ? currentVolume / averageVolume
      : 0;

  // Factor 1: unusual price movement
  const priceFactor = absoluteZScore >= 2;

  // Factor 2: unusually high volume
  const volumeFactor = volumeRatio >= 1.5;

  // We require BOTH factors to agree.
  const meaningfulChange =
    priceFactor && volumeFactor;

  let urgency = "Low";

  if (meaningfulChange) {
    if (absoluteZScore >= 3 && volumeRatio >= 2) {
      urgency = "High";
    } else {
      urgency = "Medium";
    }
  }

  let reason =
    "No meaningful change detected.";

  if (meaningfulChange) {
    reason =
      `Price movement is ${absoluteZScore.toFixed(
        2
      )} standard deviations from the recent norm, with volume ${volumeRatio.toFixed(
        2
      )}× the recent average.`;
  }

  return {
    signalScore: Number(
      absoluteZScore.toFixed(2)
    ),
    urgency,
    zScore: Number(zScore.toFixed(2)),
    volumeRatio: Number(volumeRatio.toFixed(2)),
    reason,
  };
};

module.exports = {
  calculateSignal,
  calculateReturns,
};