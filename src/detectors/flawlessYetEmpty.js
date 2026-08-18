var AIBlocker = AIBlocker || {};
AIBlocker.detectors = AIBlocker.detectors || {};

(function () {
  const FIRST_PERSON = /\b(i|i'm|i’ve|im|i've|ive|i'll|ill|me|my|mine|we|we're|we’re|we've|we’ve|us|our|ours)\b/i;
  const SPECIFIC = /\b(\d+|january|february|march|april|june|july|august|september|october|november|december|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i;

  AIBlocker.detectors.flawlessYetEmpty = function detectFlawlessYetEmpty(value) {
    const { minGenericOpeners, genericOpeners } = AIBlocker.SETTINGS.flawlessYetEmpty;
    const lower = AIBlocker.text.normalize(value).toLowerCase();
    const { total, hits } = AIBlocker.text.countMatches(lower, genericOpeners);

    let withoutOpeners = lower;
    for (const opener of genericOpeners) {
      withoutOpeners = withoutOpeners.replaceAll(opener, " ");
    }

    const hasFirstPerson = FIRST_PERSON.test(withoutOpeners);
    const hasSpecifics = SPECIFIC.test(withoutOpeners);
    const hasEnoughOpeners = total >= minGenericOpeners;
    const failed = !hasFirstPerson && !hasSpecifics && hasEnoughOpeners;

    let reason;
    if (failed) {
      reason = `No first-person or specifics, plus ${total} generic opener(s): ${hits.join(", ")}.`;
    } else {
      const parts = [];
      if (hasFirstPerson) parts.push("has first-person");
      if (hasSpecifics) parts.push("has numbers/dates");
      if (!hasEnoughOpeners) parts.push(`only ${total} generic opener(s)`);
      reason = parts.join("; ") || "Did not meet empty-post criteria.";
    }

    return {
      name: "flawlessYetEmpty",
      failed,
      reason,
    };
  };
})();
