var AIBlocker = AIBlocker || {};

(function (text) {
  const SENTENCE_SPLIT = /(?<=[.!?])\s+|\n+/;

  text.normalize = function normalize(value) {
    return String(value || "")
      .replace(/\u00a0/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  };

  text.splitLines = function splitLines(value) {
    return String(value || "")
      .replace(/\u00a0/g, " ")
      .replace(/\r\n?/g, "\n")
      .split("\n")
      .map((line) => line.replace(/[ \t]+/g, " ").trim());
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

  const DEFAULT_ARROW_PREFIXES = ["-->", "→", "—", "–"];
  const DEFAULT_EMOJI_BULLETS = ["🚀", "🧠", "💡", "🔥", "✅"];
  const MONTHS =
    "january|february|march|april|may|june|july|august|september|october|november|december";

  text.findingPrefix = function findingPrefix(line) {
    const trimmed = String(line || "").trim();
    if (!trimmed) {
      return null;
    }

    const arrows =
      AIBlocker.SETTINGS.structuralTemplating?.findingPrefixes || DEFAULT_ARROW_PREFIXES;
    for (const prefix of arrows) {
      if (trimmed.startsWith(prefix)) {
        return prefix;
      }
    }

    const emojis = AIBlocker.SETTINGS.structuralTemplating?.emojiBullets || DEFAULT_EMOJI_BULLETS;
    for (const emoji of emojis) {
      if (trimmed.startsWith(emoji)) {
        return emoji;
      }
    }

    if (/^-\s/.test(trimmed)) {
      return "- ";
    }
    if (/^[•*]\s/.test(trimmed)) {
      return trimmed[0];
    }

    const numbered = trimmed.match(/^\d+[.)]\s/);
    return numbered ? numbered[0] : null;
  };

  text.longestFindingRun = function longestFindingRun(lines) {
    let best = 0;
    let run = 0;
    let current = null;

    for (const line of lines) {
      const prefix = text.findingPrefix(line);
      if (prefix && prefix === current) {
        run += 1;
      } else if (prefix) {
        current = prefix;
        run = 1;
      } else {
        current = null;
        run = 0;
      }
      best = Math.max(best, run);
    }

    return best;
  };

  text.countFindingMarkers = function countFindingMarkers(value) {
    const raw = String(value || "");
    const arrows = (raw.match(/-->/g) || []).length + (raw.match(/→/g) || []).length;
    let others = 0;

    for (const line of text.splitLines(raw)) {
      const prefix = text.findingPrefix(line);
      if (prefix && prefix !== "-->" && prefix !== "→") {
        others += 1;
      }
    }

    return arrows + others;
  };

  text.findingScore = function findingScore(value) {
    const lines = text.splitLines(value).filter((line) => line.length > 0);
    return Math.max(text.longestFindingRun(lines), text.countFindingMarkers(value));
  };

  text.hasEmoji = function hasEmoji(value) {
    try {
      return /\p{Extended_Pictographic}/u.test(String(value || ""));
    } catch (_error) {
      return /[\u2600-\u27BF]|[\uD83C-\uDBFF][\uDC00-\uDFFF]/.test(String(value || ""));
    }
  };

  text.isNewsHookLine = function isNewsHookLine(line) {
    const trimmed = String(line || "").trim();
    if (!trimmed || text.findingPrefix(trimmed)) {
      return false;
    }
    return text.hasEmoji(trimmed) || /\d/.test(trimmed) || /%/.test(trimmed);
  };

  text.hasStatInLine = function hasStatInLine(line) {
    const trimmed = String(line || "").trim();
    if (!trimmed) {
      return false;
    }
    if (/%/.test(trimmed) || /\b\d{2,}\b/.test(trimmed)) {
      return true;
    }
    return new RegExp(`\\b(?:${MONTHS})\\s+\\d{1,2}\\b`, "i").test(trimmed);
  };

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
})(AIBlocker.text = AIBlocker.text || {});
