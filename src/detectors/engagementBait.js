var AIBlocker = AIBlocker || {};
AIBlocker.detectors = AIBlocker.detectors || {};

AIBlocker.detectors.engagementBait = function detectEngagementBait(value) {
  const { phrases, points } = AIBlocker.SETTINGS.engagementBait;
  const sentences = AIBlocker.text.splitSentences(value);

  if (!sentences.length) {
    return {
      name: "engagementBait",
      failed: false,
      points: 0,
      signals: [],
      reason: "No sentences to check for a closing CTA.",
    };
  }

  const tail = sentences.slice(-3).join(" ");
  const { total, hits } = AIBlocker.text.countMatches(tail, phrases);
  const failed = total > 0;

  return {
    name: "engagementBait",
    failed,
    points: failed ? points : 0,
    signals: hits,
    reason: failed
      ? `Closing CTA: "${sentences[sentences.length - 1]}"`
      : "Last sentences are not stock engagement-bait.",
  };
};
