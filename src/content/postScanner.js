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
  ];

  const CHROME_SELECTOR =
    "header, #global-nav, .global-nav, [role='banner'], .search-global-typeahead, aside, .scaffold-layout__sidebar, .msg-overlay-list-bubble";

  const TEXT_SELECTORS = [
    '[data-testid="expandable-text-box"]',
    '[data-view-name="feed-commentary"]',
    "[componentkey^='feed-commentary']",
    ".update-components-update-v2__commentary",
    ".feed-shared-update-v2__description",
    ".update-components-text",
    ".feed-shared-inline-show-more-text",
  ];

  const AUTHOR_SELECTORS = [
    ".update-components-actor__title span[aria-hidden='true']",
    ".update-components-actor__name span[aria-hidden='true']",
    "[data-view-name='feed-actor-name']",
    ".update-components-actor__title",
    ".update-components-actor__name",
    ".feed-shared-actor__name",
    "a[data-view-name='feed-actor-image'] ~ div span[aria-hidden='true']",
  ];

  const MORE_SELECTORS = [
    '.feed-shared-inline-show-more-text button[aria-expanded="false"]',
    'button.feed-shared-inline-show-more-text__see-more-less-toggle[aria-expanded="false"]',
    'button[aria-label*="see more" i]',
    'button[aria-label*="show more" i]',
    ".inline-show-more-text__link",
    '[data-testid="expandable-text-box"] button[aria-expanded="false"]',
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
        if (
          seen.has(element) ||
          isPageChrome(element) ||
          isNestedPost(element, seen) ||
          !isVisibleCard(element)
        ) {
          continue;
        }
        seen.add(element);
        posts.push(element);
      }
    }

    return posts;
  };

  function isPageChrome(element) {
    return Boolean(element.closest(CHROME_SELECTOR));
  }

  function isVisibleCard(element) {
    const rect = element.getBoundingClientRect();
    return rect.height >= MIN_HEIGHT && rect.width >= MIN_WIDTH;
  }

  scanner.isInViewport = function isInViewport(element) {
    const rect = element.getBoundingClientRect();
    const viewHeight = window.innerHeight || document.documentElement.clientHeight;
    const viewWidth = window.innerWidth || document.documentElement.clientWidth;
    const visibleHeight = Math.min(rect.bottom, viewHeight) - Math.max(rect.top, 0);
    const visibleWidth = Math.min(rect.right, viewWidth) - Math.max(rect.left, 0);
    return visibleHeight >= 40 && visibleWidth >= 40;
  };

  function clickWithoutScrolling(element) {
    const x = window.scrollX;
    const y = window.scrollY;
    try {
      element.focus({ preventScroll: true });
    } catch (_error) {
      // ignore
    }
    element.click();
    if (window.scrollX !== x || window.scrollY !== y) {
      window.scrollTo(x, y);
    }
  }

  function isNestedPost(element, seen) {
    for (const other of seen) {
      if (other !== element && (other.contains(element) || element.contains(other))) {
        return true;
      }
    }
    return false;
  }

  function findCommentary(postEl) {
    for (const selector of TEXT_SELECTORS) {
      const node = postEl.querySelector(selector);
      if (node) {
        return node;
      }
    }
    return null;
  }

  function cleanDescription(raw) {
    return String(raw || "")
      .replace(/\u00a0/g, " ")
      .replace(/\r\n?/g, "\n")
      .split("\n")
      .map((line) => line.replace(/[ \t]+/g, " ").trim())
      .join("\n")
      .replace(/(?:…|\.{2,})\s*more\s*$/i, "")
      .replace(/\bsee more\s*$/i, "")
      .replace(/\bshow more\s*$/i, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  scanner.extractPostText = function extractPostText(postEl) {
    const node = findCommentary(postEl);
    if (!node) {
      return "";
    }
    return cleanDescription(node.innerText || node.textContent || "");
  };

  const TYPE_FALLBACK = 'Georgia, "Times New Roman", ui-serif, serif';

  scanner.extractPostTypography = function extractPostTypography(postEl) {
    const node = findCommentary(postEl) || postEl;
    let style;
    try {
      style = window.getComputedStyle(node);
    } catch (_error) {
      return {
        fontFamily: TYPE_FALLBACK,
        fontSize: "16px",
        fontWeight: "400",
        lineHeight: "1.4",
      };
    }

    const family = (style.fontFamily || "").trim();
    return {
      fontFamily: family || TYPE_FALLBACK,
      fontSize: style.fontSize || "16px",
      fontWeight: style.fontWeight || "400",
      lineHeight: style.lineHeight && style.lineHeight !== "normal" ? style.lineHeight : "1.4",
    };
  };

  scanner.extractAuthorName = function extractAuthorName(postEl) {
    for (const selector of AUTHOR_SELECTORS) {
      const node = postEl.querySelector(selector);
      const name = (node?.textContent || "").replace(/\s+/g, " ").trim().split("\n")[0];
      if (name) {
        return name.trim();
      }
    }
    return "Unknown";
  };

  scanner.expandSeeMore = function expandSeeMore(postEl) {
    const scope = findCommentary(postEl) || postEl;

    for (const selector of MORE_SELECTORS) {
      const button = scope.querySelector(selector);
      if (!button) {
        continue;
      }
      const label = `${button.getAttribute("aria-label") || ""} ${button.textContent || ""}`;
      if (/comment/i.test(label)) {
        continue;
      }
      clickWithoutScrolling(button);
      return true;
    }

    for (const element of scope.querySelectorAll("button, span[role='button'], a")) {
      const label = (element.textContent || "").replace(/\s+/g, " ").trim();
      if (/^(?:…|\.{2,})?\s*more$/i.test(label)) {
        clickWithoutScrolling(element);
        return true;
      }
    }

    return false;
  };

  scanner.readFullDescription = function readFullDescription(postEl) {
    if (!scanner.expandSeeMore(postEl)) {
      return Promise.resolve(scanner.extractPostText(postEl));
    }

    return new Promise((resolve) => {
      setTimeout(() => resolve(scanner.extractPostText(postEl)), 150);
    });
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
