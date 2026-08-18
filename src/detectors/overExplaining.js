var AIBlocker = AIBlocker || {};
AIBlocker.detectors = AIBlocker.detectors || {};

AIBlocker.detectors.overExplaining = function detectOverExplaining(value) {
  const { phrases, maxFillerPer100Words } = AIBlocker.SETTINGS.overExplaining;
  const words = AIBlocker.text.wordCount(value);
  const { total, hits } = AIBlocker.text.countMatches(value, phrases);

  if (words === 0) {
    return {
      name: "overExplaining",
      failed: false,
      reason: "No words to score.",
    };
  }

  const density = (total / words) * 100;
  const failed = density > maxFillerPer100Words;

  return {
    name: "overExplaining",
    failed,
    reason: failed
      ? `Filler density ${density.toFixed(1)} per 100 words (${hits.slice(0, 5).join(", ")}).`
      : `Filler density ${density.toFixed(1)} per 100 words is under ${maxFillerPer100Words}.`,
  };
};
