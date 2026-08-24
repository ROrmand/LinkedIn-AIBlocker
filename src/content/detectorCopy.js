var AIBlocker = AIBlocker || {};

AIBlocker.detectorCopy = {
  buzzwordDensity: {
    label: "Buzzwords",
    meaning: "Stock AI transitions and phrases that show up more often in generated posts than in human writing.",
  },
  structuralTemplating: {
    label: "Template structure",
    meaning: "Hook lines, emoji bullets, or a uniform 3-intro / 5-bullets / 1-question layout.",
  },
  lackOfBurstiness: {
    label: "Even cadence",
    meaning: "Sentence lengths stay in a narrow band instead of mixing short and long the way people usually write.",
  },
  engagementBait: {
    label: "Engagement bait",
    meaning: "A closing call for comments or agreement, such as a stock “thoughts?” CTA.",
  },
  sycophanticTone: {
    label: "Empty tone",
    meaning: "Generic openers or polished-humble voice with little specific claim.",
  },
  reportListicle: {
    label: "Briefing listicle",
    meaning: "A stat hook, finding list, and briefing-style closer that reads like a report dump.",
  },
};

AIBlocker.detectorLabel = function detectorLabel(name) {
  return AIBlocker.detectorCopy[name]?.label || name;
};

AIBlocker.detectorMeaning = function detectorMeaning(name) {
  return AIBlocker.detectorCopy[name]?.meaning || "This check contributed to the AI-writing score.";
};
