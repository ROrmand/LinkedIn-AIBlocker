var AIBlocker = AIBlocker || {};
AIBlocker.detectors = AIBlocker.detectors || {};

AIBlocker.detectors.reportListicle = function detectReportListicle(value) {
  const settings = AIBlocker.SETTINGS.reportListicle;
  const lines = AIBlocker.text.splitLines(value).filter((line) => line.length > 0);
  const elements = [];
  const signals = [];

  const findingRun = AIBlocker.text.findingScore(value);
  const minFinding = settings.minFindingLines || 3;
  if (findingRun >= minFinding) {
    elements.push("findingList");
    signals.push(`${findingRun}-line finding list`);
  }

  if (lines.slice(0, 3).some((line) => AIBlocker.text.hasStatInLine(line))) {
    elements.push("statHook");
    signals.push("stat in opening lines");
  }

  const { total, hits } = AIBlocker.text.countMatches(value, settings.closerPhrases);
  if (total > 0) {
    elements.push("briefingCloser");
    signals.push(...hits.slice(0, 3));
  }

  const needed = settings.minElements || 1;
  const failed = elements.length >= needed;
  return {
    name: "reportListicle",
    failed,
    points: failed ? settings.points : 0,
    signals,
    reason: failed
      ? `Briefing listicle marks: ${elements.join(", ")}.`
      : `Only ${elements.length} briefing mark(s); need ${needed}.`,
  };
};
