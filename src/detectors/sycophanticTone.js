var AIBlocker = AIBlocker || {};
AIBlocker.detectors = AIBlocker.detectors || {};

AIBlocker.detectors.sycophanticTone = function detectSycophanticTone(value) {
  const settings = AIBlocker.SETTINGS.sycophanticTone;
  const lower = AIBlocker.text.normalize(value).toLowerCase();
  const { total: openerCount, hits: openerHits } = AIBlocker.text.countMatches(
    lower,
    settings.genericOpeners,
  );
  const { total: optimisticCount, hits: optimisticHits } = AIBlocker.text.countMatches(
    lower,
    settings.optimisticPhrases,
  );

  const emptyVoice = openerCount >= settings.minGenericOpeners;
  const overlyPolished = optimisticCount >= settings.minOptimisticPhrases;
  const failed = emptyVoice || overlyPolished;
  const signals = failed ? [...openerHits, ...optimisticHits] : [];

  let reason;
  if (emptyVoice) {
    reason = `Generic opener(s): ${openerHits.slice(0, 4).join(", ") || openerCount}.`;
  } else if (overlyPolished) {
    reason = `Overly optimistic phrasing: ${optimisticHits.slice(0, 4).join(", ")}.`;
  } else {
    reason = "No generic opener or polished-optimistic cluster.";
  }

  return {
    name: "sycophanticTone",
    failed,
    points: failed ? settings.points : 0,
    signals,
    reason,
  };
};
