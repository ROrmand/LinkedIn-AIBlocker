var AIBlocker = AIBlocker || {};

(function (scanner) {
  // LinkedIn's 2026 feed uses data-view-name / data-id / componentkey.
  // data-urn is often missing on the home feed wrapper.
  const POST_SELECTORS = [
    '[data-view-name="feed-full-update"]',
    '[data-view-name="feed-mini-update"]',
    'div[componentkey*="FeedType_"]',
    ".feed-shared-update-v2",
    'div[data-id^="urn:li:activity"]',
    'div[data-id^="urn:li:share"]',
    'div[data-id^="urn:li:ugcPost"]',
    'div[data-urn^="urn:li:activity"]',
    'div[data-urn^="urn:li:share"]',
    'div[data-urn^="urn:li:ugcPost"]',
    'div[data-urn^="urn:li:aggregatedShare"]',
    'main [role="article"]',
    'main [role="listitem"]',
  ];

  const TEXT_SELECTORS = [
    '[data-testid="expandable-text-box"]',
    '[data-view-name="feed-commentary"]',
    "[componentkey^='feed-commentary']",
    ".update-components-update-v2__commentary",
    ".feed-shared-update-v2__description",
    ".update-components-text",
    ".feed-shared-inline-show-more-text",
  ];

  const MIN_HEIGHT = 80;
  const MIN_WIDTH = 160;

  const scanned = new WeakSet();
  const dismissedNodes = new WeakSet();
  const dismissedIds = new Set();

  scanner.findPosts = function findPosts() {
    const seen = new Set();
    const posts = [];

    for (const selector of POST_SELECTORS) {
      let nodes;
      try {
        nodes = document.querySelectorAll(selector);
      } catch (_error) {
        continue;
      }

      for (const element of nodes) {
        if (seen.has(element) || isNestedPost(element, seen) || !isVisibleCard(element)) {
          continue;
        }
        seen.add(element);
        posts.push(element);
      }
    }

    return posts;
  };

  function isVisibleCard(element) {
    const rect = element.getBoundingClientRect();
    return rect.height >= MIN_HEIGHT && rect.width >= MIN_WIDTH;
  }

  function isNestedPost(element, seen) {
    for (const other of seen) {
      if (other !== element && (other.contains(element) || element.contains(other))) {
        return true;
      }
    }
    return false;
  }

  scanner.extractPostText = function extractPostText(postEl) {
    for (const selector of TEXT_SELECTORS) {
      const node = postEl.querySelector(selector);
      const value = node?.innerText?.trim();
      if (value) {
        return value;
      }
    }
    return (postEl.innerText || "").trim();
  };

  scanner.getPostId = function getPostId(postEl) {
    return (
      postEl.getAttribute("data-id") ||
      postEl.getAttribute("data-urn") ||
      postEl.getAttribute("componentkey") ||
      postEl.querySelector("[data-id]")?.getAttribute("data-id") ||
      postEl.querySelector("[data-urn]")?.getAttribute("data-urn") ||
      null
    );
  };

  scanner.isScanned = function isScanned(postEl) {
    return scanned.has(postEl);
  };

  scanner.markScanned = function markScanned(postEl) {
    scanned.add(postEl);
  };

  scanner.isDismissed = function isDismissed(postEl) {
    const id = scanner.getPostId(postEl);
    return dismissedNodes.has(postEl) || (id !== null && dismissedIds.has(id));
  };

  scanner.rememberDismissed = function rememberDismissed(postEl) {
    dismissedNodes.add(postEl);
    const id = scanner.getPostId(postEl);
    if (id) {
      dismissedIds.add(id);
    }
  };
})(AIBlocker.scanner = AIBlocker.scanner || {});
