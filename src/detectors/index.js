var AIBlocker = AIBlocker || {};

AIBlocker.runDetectors = function runDetectors(value) {
  const registry = [
    { key: "lackOfBurstiness", run: AIBlocker.detectors.lackOfBurstiness },
    { key: "ruleOfThree", run: AIBlocker.detectors.ruleOfThree },
    { key: "overExplaining", run: AIBlocker.detectors.overExplaining },
    { key: "flawlessYetEmpty", run: AIBlocker.detectors.flawlessYetEmpty },
  ];

  const results = [];

  for (const { key, run } of registry) {
    if (!AIBlocker.SETTINGS.detectors[key]) {
      continue;
    }
    results.push(run(value));
  }

  const failedCount = results.filter((result) => result.failed).length;

  return {
    results,
    failedCount,
    shouldCover: failedCount > AIBlocker.SETTINGS.failureThreshold,
  };
};
