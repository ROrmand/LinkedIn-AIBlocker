var AIBlocker = AIBlocker || {};

AIBlocker.runDetectors = function runDetectors(value) {
  const registry = [
    { key: "buzzwordDensity", run: AIBlocker.detectors.buzzwordDensity },
    { key: "structuralTemplating", run: AIBlocker.detectors.structuralTemplating },
    { key: "lackOfBurstiness", run: AIBlocker.detectors.lackOfBurstiness },
    { key: "engagementBait", run: AIBlocker.detectors.engagementBait },
    { key: "sycophanticTone", run: AIBlocker.detectors.sycophanticTone },
    { key: "reportListicle", run: AIBlocker.detectors.reportListicle },
  ];

  const results = [];

  for (const { key, run } of registry) {
    if (!AIBlocker.SETTINGS.detectors[key]) {
      continue;
    }
    results.push(run(value));
  }

  const parametersHit = results.filter((result) => result.failed).length;
  const ai_score = Math.min(
    100,
    results.reduce((sum, result) => sum + (result.points || 0), 0),
  );
  const signals_detected = results.flatMap((result) => result.signals || []);
  const failedReasons = results.filter((result) => result.failed).map((result) => result.reason);
  const reasoning = failedReasons.length
    ? failedReasons.slice(0, 2).join(" ")
    : "No AI-writing parameters fired at full weight.";
  const flagged =
    ai_score >= AIBlocker.SETTINGS.coverScoreThreshold &&
    parametersHit >= AIBlocker.SETTINGS.coverMinParameters;

  return {
    results,
    failedCount: parametersHit,
    parametersHit,
    parameterCount: registry.length,
    ai_score,
    confidence: scoreConfidence(ai_score, parametersHit),
    signals_detected,
    reasoning,
    flagged,
    shouldCover: flagged,
  };
};

function scoreConfidence(score, parametersHit) {
  if (parametersHit >= 3 || score >= 75) {
    return "High";
  }
  if (parametersHit === 2 || score >= 40) {
    return "Medium";
  }
  return "Low";
}
