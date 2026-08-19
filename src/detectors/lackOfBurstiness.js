var AIBlocker = AIBlocker || {};
AIBlocker.detectors = AIBlocker.detectors || {};

AIBlocker.detectors.lackOfBurstiness = function detectLackOfBurstiness(value) {
  const { minSentences, minWords, maxWords, maxNarrowShare, points } = AIBlocker.SETTINGS.burstiness;
  const counts = AIBlocker.text.sentenceWordCounts(value);

  if (counts.length < minSentences) {
    return {
      name: "lackOfBurstiness",
      failed: false,
      points: 0,
      signals: [],
      reason: `Only ${counts.length} sentence(s); need ${minSentences} to judge cadence.`,
    };
  }

  const narrow = counts.filter((count) => count >= minWords && count <= maxWords).length;
  const share = narrow / counts.length;
  const failed = share >= maxNarrowShare;

  return {
    name: "lackOfBurstiness",
    failed,
    points: failed ? points : 0,
    signals: failed ? [`${Math.round(share * 100)}% of sentences are ${minWords}–${maxWords} words`] : [],
    reason: failed
      ? `${Math.round(share * 100)}% of sentences fall in a ${minWords}–${maxWords} word window.`
      : `${Math.round(share * 100)}% of sentences are ${minWords}–${maxWords} words (need ${Math.round(maxNarrowShare * 100)}%+).`,
  };
};
