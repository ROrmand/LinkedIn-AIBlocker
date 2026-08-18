var AIBlocker = AIBlocker || {};
AIBlocker.detectors = AIBlocker.detectors || {};

(function () {
  const PATTERNS = [
    /\b\w+,\s*\w+,\s*(and|or)\s+\w+/gi,
    /\bnot just\b.{0,80}?\b(it's|its|but)\b/gi,
    /\b(it's not just|its not just)\b.{0,80}?\bit'?s\b/gi,
    /(?:^|[.!?]\s+)[^.!?]{5,40};\s*[^.!?]{5,40};\s*[^.!?]{5,40}[.!?]/gi,
    /\b(first|second|third)([,.]?\s+(second|third)|[,:]?\s+\w+){1,2}/gi,
  ];

  AIBlocker.detectors.ruleOfThree = function detectRuleOfThree(value) {
    const { minMatches } = AIBlocker.SETTINGS.ruleOfThree;
    const { total, hits } = AIBlocker.text.countMatches(value, PATTERNS);
    const failed = total >= minMatches;

    return {
      name: "ruleOfThree",
      failed,
      reason: failed
        ? `${total} triple/parallel hits (${hits.join(", ")}).`
        : `${total} triple/parallel hit(s); need ${minMatches}.`,
    };
  };
})();
