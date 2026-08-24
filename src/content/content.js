(function () {
  const { SETTINGS, scanner, runDetectors, coverPost, showScoreBadge, text } = AIBlocker;

  let lastPostCount = -1;
  let scanning = false;

  function emptyVerdict() {
    return {
      flagged: false,
      ai_score: 0,
      confidence: "Low",
      signals_detected: [],
      results: [],
      reasoning: "Post too short to score.",
      parametersHit: 0,
      parameterCount: 6,
      shouldCover: false,
    };
  }

  function logVerdict(author, verdict) {
    console.info("[AI Blocker]", {
      author,
      flagged: verdict.flagged,
      ai_score: verdict.ai_score,
      confidence: verdict.confidence,
      signals_detected: verdict.signals_detected,
      reasoning: verdict.reasoning,
    });
  }

  async function scanFeed() {
    if (scanning) {
      return;
    }
    scanning = true;

    try {
      AIBlocker.ensureOverlayHost();
      const posts = scanner.findPosts();

      if (SETTINGS.debug && posts.length !== lastPostCount) {
        lastPostCount = posts.length;
        console.info("[AI Blocker] scan", {
          posts: posts.length,
          coverAllPosts: SETTINGS.coverAllPosts,
        });
      }

      for (const post of posts) {
        if (scanner.isDismissed(post) || AIBlocker.hasOverlay(post)) {
          continue;
        }

        if (!scanner.isInViewport(post)) {
          continue;
        }

        if (scanner.isScanned(post)) {
          continue;
        }

        scanner.markScanned(post);

        const value = await scanner.readFullDescription(post);
        const author = scanner.extractAuthorName(post);

        if (text.normalize(value).length < SETTINGS.minTextLength) {
          const verdict = emptyVerdict();
          showScoreBadge(post, verdict);
          AIBlocker.recordScan(post, verdict.flagged);
          logVerdict(author, verdict);
          if (SETTINGS.coverAllPosts) {
            coverPost(post, verdict);
          }
          continue;
        }

        const verdict = runDetectors(value);
        showScoreBadge(post, verdict);
        AIBlocker.recordScan(post, verdict.flagged);
        logVerdict(author, verdict);

        if (SETTINGS.debug) {
          console.debug("[AI Blocker] details", {
            id: scanner.getPostId(post) ?? "(no id)",
            cover: verdict.shouldCover,
            results: verdict.results,
          });
        }

        if (SETTINGS.coverAllPosts || verdict.flagged) {
          coverPost(post, verdict);
        }
      }

      AIBlocker.syncOverlays();
    } finally {
      scanning = false;
    }
  }

  function debounce(fn, waitMs) {
    let timer = 0;
    return function () {
      clearTimeout(timer);
      timer = setTimeout(fn, waitMs);
    };
  }

  const scheduleScan = debounce(scanFeed, SETTINGS.scanDebounceMs);

  function start() {
    const root = document.documentElement;
    if (!root) {
      requestAnimationFrame(start);
      return;
    }

    console.info("[AI Blocker] loaded");
    AIBlocker.ensureOverlayHost();
    AIBlocker.startComposerCoach();

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.removedNodes) {
          const kind = node && node.getAttribute && node.getAttribute("data-ai-blocker");
          if (kind === "host" || kind === "stats") {
            AIBlocker.ensureOverlayHost();
          }
          if (kind === "coach" && typeof AIBlocker.syncComposerCoach === "function") {
            AIBlocker.syncComposerCoach();
          }
        }
      }
      scheduleScan();
      scheduleCoach();
    });
    observer.observe(root, { childList: true, subtree: true });

    window.addEventListener("scroll", scheduleScan, true);
    setInterval(scanFeed, 1500);
    scanFeed();
  }

  const scheduleCoach = debounce(() => {
    if (typeof AIBlocker.syncComposerCoach === "function") {
      AIBlocker.syncComposerCoach();
    }
  }, SETTINGS.scanDebounceMs || 300);

  start();
})();
