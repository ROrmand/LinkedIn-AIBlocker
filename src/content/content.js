(function () {
  const { SETTINGS, scanner, runDetectors, coverPost, text } = AIBlocker;

  let lastPostCount = -1;

  function scanFeed() {
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

      if (SETTINGS.coverAllPosts) {
        coverPost(post);
        continue;
      }

      if (scanner.isScanned(post)) {
        continue;
      }

      scanner.markScanned(post);

      const value = text.normalize(scanner.extractPostText(post));
      if (value.length < SETTINGS.minTextLength) {
        continue;
      }

      const verdict = runDetectors(value);

      if (SETTINGS.debug) {
        const failed = verdict.results
          .filter((result) => result.failed)
          .map((result) => `${result.name}: ${result.reason}`);
        console.info(
          "[AI Blocker]",
          scanner.getPostId(post) ?? "(no id)",
          `${verdict.failedCount} failed`,
          failed,
        );
      }

      if (verdict.shouldCover) {
        coverPost(post);
      }
    }

    AIBlocker.syncOverlays();
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

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.removedNodes) {
          if (node && node.getAttribute && node.getAttribute("data-ai-blocker") === "host") {
            AIBlocker.ensureOverlayHost();
          }
        }
      }
      scheduleScan();
    });
    observer.observe(root, { childList: true, subtree: true });

    window.addEventListener("scroll", scheduleScan, true);
    setInterval(scanFeed, 1500);
    scanFeed();
  }

  start();
})();
