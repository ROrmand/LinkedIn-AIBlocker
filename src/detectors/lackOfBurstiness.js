var AIBlocker = AIBlocker || {};
AIBlocker.detectors = AIBlocker.detectors || {};

AIBlocker.detectors.lackOfBurstiness = function detectLackOfBurstiness(value) {
  const { minSentences, maxCoefficientOfVariation } = AIBlocker.SETTINGS.burstiness;
  const sentences = AIBlocker.text.splitSentences(value);
  const counts = AIBlocker.text.sentenceWordCounts(value);

  if (sentences.length < minSentences) {
    return {
      name: "lackOfBurstiness",
      failed: false,
      reason: `Only ${sentences.length} sentence(s); need ${minSentences} to judge cadence.`,
    };
  }

  const cv = AIBlocker.text.coefficientOfVariation(counts);
  const failed = cv < maxCoefficientOfVariation;

  return {
    name: "lackOfBurstiness",
    failed,
    reason: failed
      ? `Sentence-length CV ${cv.toFixed(2)} is below ${maxCoefficientOfVariation} (even cadence).`
      : `Sentence-length CV ${cv.toFixed(2)} looks varied enough.`,
  };
};
