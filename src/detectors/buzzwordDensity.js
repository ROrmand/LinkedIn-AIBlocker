var AIBlocker = AIBlocker || {};
AIBlocker.detectors = AIBlocker.detectors || {};

AIBlocker.detectors.buzzwordDensity = function detectBuzzwordDensity(value) {
  const { phrases, fullPoints, partialPoints, fullMatchMin } = AIBlocker.SETTINGS.buzzwordDensity;
  const { total, hits } = AIBlocker.text.countMatches(value, phrases);

  if (total >= fullMatchMin) {
    return {
      name: "buzzwordDensity",
      failed: true,
      points: fullPoints,
      signals: hits,
      reason: `${total} AI-favored buzzword/transition hits (${hits.slice(0, 5).join(", ")}).`,
    };
  }

  if (total >= 1) {
    return {
      name: "buzzwordDensity",
      failed: false,
      points: partialPoints,
      signals: hits,
      reason: `${total} buzzword hit(s); partial score only.`,
    };
  }

  return {
    name: "buzzwordDensity",
    failed: false,
    points: 0,
    signals: [],
    reason: "No buzzword or transition matches.",
  };
};
