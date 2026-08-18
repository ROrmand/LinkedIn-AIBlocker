var AIBlocker = AIBlocker || {};

(function (text) {
  const SENTENCE_SPLIT = /(?<=[.!?])\s+|\n+/;

  text.normalize = function normalize(value) {
    return String(value || "")
      .replace(/\u00a0/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  };

  text.splitSentences = function splitSentences(value) {
    const cleaned = text.normalize(value);
    if (!cleaned) {
      return [];
    }

    return cleaned
      .split(SENTENCE_SPLIT)
      .map((sentence) => sentence.trim())
      .filter((sentence) => sentence.length > 0);
  };

  text.wordCount = function wordCount(value) {
    const cleaned = text.normalize(value);
    if (!cleaned) {
      return 0;
    }
    return cleaned.split(" ").filter(Boolean).length;
  };

  text.sentenceWordCounts = function sentenceWordCounts(value) {
    return text.splitSentences(value).map((sentence) => text.wordCount(sentence));
  };

  text.mean = function mean(values) {
    if (!values.length) {
      return 0;
    }
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  };

  text.standardDeviation = function standardDeviation(values) {
    if (values.length < 2) {
      return 0;
    }
    const avg = text.mean(values);
    const variance =
      values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length;
    return Math.sqrt(variance);
  };

  text.coefficientOfVariation = function coefficientOfVariation(values) {
    const avg = text.mean(values);
    if (avg === 0) {
      return 0;
    }
    return text.standardDeviation(values) / avg;
  };

  text.countMatches = function countMatches(value, patterns) {
    const lower = text.normalize(value).toLowerCase();
    let total = 0;
    const hits = [];

    for (const pattern of patterns) {
      const source = pattern instanceof RegExp ? pattern.source : escapeRegExp(pattern);
      const regex = new RegExp(source, "gi");
      const found = lower.match(regex);
      if (found?.length) {
        total += found.length;
        hits.push(typeof pattern === "string" ? pattern : pattern.source);
      }
    }

    return { total, hits };
  };

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
})(AIBlocker.text = AIBlocker.text || {});
