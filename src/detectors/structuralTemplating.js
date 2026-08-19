var AIBlocker = AIBlocker || {};
AIBlocker.detectors = AIBlocker.detectors || {};

(function () {
  AIBlocker.detectors.structuralTemplating = function detectStructuralTemplating(value) {
    const settings = AIBlocker.SETTINGS.structuralTemplating;
    const lines = AIBlocker.text.splitLines(value).filter((line) => line.length > 0);
    const elements = [];
    const signals = [];
    const firstLine = lines[0] || "";

    const hookHits = findHooks(value, settings);
    if (hookHits.length) {
      elements.push("hook");
      signals.push(...hookHits.slice(0, 3));
    } else if (AIBlocker.text.isNewsHookLine(firstLine)) {
      elements.push("hook");
      signals.push("news hook");
    }

    const findingRun = AIBlocker.text.findingScore(value);
    if (findingRun >= (settings.minFindingLines || 3)) {
      elements.push("findingList");
      signals.push(`${findingRun}-line finding list`);
    }

    if (hasUniform351(lines, settings)) {
      elements.push("uniformLayout");
      signals.push("3 intro / 5 bullets / 1 question");
    }

    const failed = elements.length >= settings.minElements;
    return {
      name: "structuralTemplating",
      failed,
      points: failed ? settings.points : 0,
      signals,
      reason: failed
        ? `Template elements: ${elements.join(", ")}.`
        : `Only ${elements.length} template element(s); need ${settings.minElements}.`,
    };
  };

  function findHooks(value, settings) {
    const hits = [];
    const { hits: phraseHits } = AIBlocker.text.countMatches(value, settings.hooks);
    hits.push(...phraseHits);
    const { hits: patternHits } = AIBlocker.text.countMatches(value, settings.hookPatterns);
    hits.push(...patternHits);
    return hits;
  }

  function hasUniform351(lines, settings) {
    const intro = settings.introLines;
    const bullets = settings.bulletLines;
    if (lines.length !== intro + bullets + 1) {
      return false;
    }

    const introLines = lines.slice(0, intro);
    const bulletBlock = lines.slice(intro, intro + bullets);
    const closing = lines[lines.length - 1];

    const introPlain = introLines.every((line) => !AIBlocker.text.findingPrefix(line));
    const allBullets = bulletBlock.every((line) => Boolean(AIBlocker.text.findingPrefix(line)));
    const closingQuestion = /[?？]\s*$/.test(closing);

    return introPlain && allBullets && closingQuestion;
  }
})();
