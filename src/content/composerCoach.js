var AIBlocker = AIBlocker || {};

(function () {
  const SETTINGS = AIBlocker.SETTINGS;
  const COACH_WIDTH = 280;
  const GAP = 12;
  const DEBOUNCE_MS = 200;
  const CLOSE_MISS_LIMIT = 3;
  const MIN_TOOLBAR_HITS = 3;

  // Create-a-post footer icons (emoji, photo, event, celebrate, more).
  // Prefer aria-labels / sprite ids; Ember button ids change every session.
  const TOOLBAR_SIGNALS = [
    {
      name: "emoji",
      selectors: [
        'button[aria-label="Open Emoji Keyboard"]',
        "button.share_creation_state__emoji-picker-trigger",
        'use[href="#emoji-medium"]',
        'use[*|href="#emoji-medium"]',
        'use[href*="emoji-medium"]',
      ],
    },
    {
      name: "image",
      selectors: [
        'use[href="#image-medium"]',
        'use[*|href="#image-medium"]',
        'use[href*="image-medium"]',
        'button[aria-label*="Add a photo"]',
        'button[aria-label*="photo"]',
        'button[aria-label*="Image"]',
      ],
    },
    {
      name: "event",
      selectors: [
        'use[href="#calendar-medium"]',
        'use[*|href="#calendar-medium"]',
        'use[href*="calendar-medium"]',
        'button[aria-label*="Create an event"]',
        'button[aria-label*="event"]',
      ],
    },
    {
      name: "celebrate",
      selectors: [
        'use[href="#celebrate-medium"]',
        'use[*|href="#celebrate-medium"]',
        'use[href*="celebrate-medium"]',
        'button[aria-label*="Celebrate"]',
        'button[aria-label*="occasion"]',
      ],
    },
    {
      name: "more",
      selectors: [
        'use[href="#plus-medium"]',
        'use[*|href="#plus-medium"]',
        'use[href*="plus-medium"]',
        'button[aria-label="Open the more options menu for sharing content"]',
        'button[aria-label*="Add more"]',
      ],
    },
  ];

  const EDITOR_SELECTORS = [
    '.ql-editor[contenteditable="true"]',
    '[data-test-ql-editor-contenteditable="true"]',
    '[role="textbox"][contenteditable="true"]',
    '.share-creation-state__text-editor [contenteditable="true"]',
    'div[data-placeholder*="What do you want to talk about"]',
    'div[aria-placeholder*="What do you want to talk about"]',
  ];

  const COMMENT_ANCESTOR =
    ".comments-comment-box, .comments-comment-texteditor, [data-view-name='feed-comment']";
  const FEED_POST_ANCESTOR =
    '.feed-shared-update-v2, [data-view-name="feed-full-update"], [data-view-name="feed-mini-update"], [data-view-name="feed-commentary"]';

  const CSS = `
    :host {
      all: initial;
      position: fixed !important;
      z-index: 2147483001 !important;
      pointer-events: auto !important;
      display: block !important;
      width: ${COACH_WIDTH}px !important;
      box-sizing: border-box !important;
    }
    .ai-blocker-coach {
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 16px 16px 14px;
      overflow: auto;
      border: 1px solid #000;
      border-radius: 14px;
      background: #fff;
      color: #111;
      cursor: default;
      user-select: none;
      font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
      font-size: 15px;
      font-weight: 400;
      line-height: 1.4;
      text-align: left;
    }
    .ai-blocker-overlay__kicker {
      margin: 0;
      color: #111;
      font-size: 0.7em;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
    .ai-blocker-overlay__title {
      margin: 2px 0 0;
      font-size: 1.2em;
      font-weight: 800;
      line-height: 1.25;
    }
    .ai-blocker-overlay__toggles {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin: 10px 0 0;
      flex-shrink: 0;
    }
    .ai-blocker-overlay__toggle {
      box-sizing: border-box;
      width: 100%;
      min-width: 0;
      margin: 0;
      padding: 8px 10px;
      border: 1px solid #000;
      border-radius: 10px;
      background: #fff;
      color: inherit;
      font: inherit;
      font-weight: 600;
      text-align: left;
    }
    .ai-blocker-overlay__toggle.is-flagged {
      background: #111;
      border-color: #000;
      color: #fff;
    }
    .ai-blocker-overlay__toggle-label {
      display: block;
      font-size: 0.7em;
      font-weight: 500;
      opacity: 0.8;
    }
    .ai-blocker-overlay__toggle-value {
      display: block;
      font-family: ui-monospace, Menlo, Consolas, monospace;
      font-size: 1.15em;
      font-weight: 700;
      line-height: 1.2;
    }
    .ai-blocker-coach__hint {
      margin: 10px 0 0;
      font-size: 0.9em;
      line-height: 1.45;
    }
    .ai-blocker-coach__flags {
      margin: 10px 0 0;
      flex: 1 1 auto;
      min-height: 0;
    }
    .ai-blocker-overlay__flags {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .ai-blocker-overlay__flag {
      margin: 0;
      padding: 0;
      border: 1px solid #000;
      border-radius: 10px;
      background: #fff;
    }
    .ai-blocker-overlay__flag.is-failed {
      border-width: 2px;
    }
    .ai-blocker-overlay__flag-btn {
      box-sizing: border-box;
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 8px;
      width: 100%;
      margin: 0;
      padding: 7px 8px;
      border: 0;
      background: transparent;
      color: inherit;
      cursor: pointer;
      font: inherit;
      text-align: left;
    }
    .ai-blocker-overlay__flag-name {
      font-weight: 600;
    }
    .ai-blocker-overlay__flag-meta {
      flex-shrink: 0;
      font-family: ui-monospace, Menlo, Consolas, monospace;
      font-size: 0.85em;
      font-weight: 700;
    }
    .ai-blocker-overlay__flag.is-failed .ai-blocker-overlay__flag-meta {
      color: #111;
    }
    .ai-blocker-overlay__flag-detail-slot {
      display: grid;
      grid-template-rows: 0fr;
      transition: grid-template-rows 0.18s ease;
    }
    .ai-blocker-overlay__flag.is-open .ai-blocker-overlay__flag-detail-slot {
      grid-template-rows: 1fr;
    }
    .ai-blocker-overlay__flag-detail-clip {
      min-height: 0;
      overflow: hidden;
    }
    .ai-blocker-overlay__flag-detail {
      margin: 0;
      padding: 0 8px 8px;
      border-top: 1px solid rgba(26, 26, 26, 0.2);
      font-size: 0.85em;
      line-height: 1.4;
    }
    .ai-blocker-overlay__flag-detail p {
      margin: 8px 0 0;
    }
    .ai-blocker-overlay__signals {
      margin: 6px 0 0;
      padding: 0;
      color: #444;
      font-size: 0.95em;
    }
    .ai-blocker-overlay__explain {
      margin: 0;
      font-size: 0.9em;
      line-height: 1.45;
    }
    @media (prefers-reduced-motion: reduce) {
      .ai-blocker-overlay__flag-detail-slot {
        transition: none;
      }
    }
  `;

  let host = null;
  let scoreValueEl = null;
  let paramsValueEl = null;
  let scoreTileEl = null;
  let hintEl = null;
  let flagsEl = null;
  let openFlagName = null;
  let editorEl = null;
  let composerEl = null;
  let editorObserver = null;
  let debounceTimer = 0;
  let started = false;
  let composerActive = false;
  let closeMisses = 0;
  let lastText = null;

  function emptyVerdict() {
    const total = AIBlocker.overlayUi?.DETECTOR_ORDER?.length || 6;
    return {
      flagged: false,
      ai_score: 0,
      confidence: "Low",
      signals_detected: [],
      results: [],
      reasoning: "Post too short to score.",
      parametersHit: 0,
      parameterCount: total,
      shouldCover: false,
    };
  }

  function isVisible(element) {
    if (!element?.isConnected) {
      return false;
    }
    const rect = element.getBoundingClientRect();
    if (rect.width < 8 || rect.height < 8) {
      return false;
    }
    const viewHeight = window.innerHeight || document.documentElement.clientHeight;
    const viewWidth = window.innerWidth || document.documentElement.clientWidth;
    const visibleHeight = Math.min(rect.bottom, viewHeight) - Math.max(rect.top, 0);
    const visibleWidth = Math.min(rect.right, viewWidth) - Math.max(rect.left, 0);
    return visibleHeight >= 8 && visibleWidth >= 8;
  }

  function isCommentEditor(element) {
    return Boolean(element?.closest(COMMENT_ANCESTOR));
  }

  function isFeedPostEditor(element) {
    return Boolean(element?.closest(FEED_POST_ANCESTOR));
  }

  function queryFirst(root, selectors) {
    for (const selector of selectors) {
      try {
        const node = root.querySelector(selector);
        if (node) {
          return node;
        }
      } catch (_error) {
        // ignore invalid selectors
      }
    }
    return null;
  }

  function countToolbarHits(root) {
    if (!root?.querySelector) {
      return { hits: 0, nodes: [] };
    }
    const nodes = [];
    let hits = 0;
    for (const signal of TOOLBAR_SIGNALS) {
      const node = queryFirst(root, signal.selectors);
      if (node) {
        hits += 1;
        nodes.push(node);
      }
    }
    return { hits, nodes };
  }

  function findComposerAnchor(fromNode) {
    if (!fromNode?.closest) {
      return null;
    }
    return (
      fromNode.closest(
        [
          ".share-box-v2__modal",
          '[aria-labelledby="share-to-linkedin-modal__header"]',
          '[data-test-modal][role="dialog"]',
          ".share-creation-state",
          '[role="dialog"]',
          "[aria-modal='true']",
        ].join(", "),
      ) || null
    );
  }

  function findEditorIn(root) {
    if (!root?.querySelectorAll) {
      return null;
    }
    for (const selector of EDITOR_SELECTORS) {
      let nodes;
      try {
        nodes = root.querySelectorAll(selector);
      } catch (_error) {
        continue;
      }
      for (const node of nodes) {
        if (node.classList?.contains("ql-clipboard")) {
          continue;
        }
        if (isCommentEditor(node) || isFeedPostEditor(node)) {
          continue;
        }
        return node;
      }
    }
    return null;
  }

  /** Draft mode = create-post toolbar (the 5 footer icons) is in the DOM. */
  function findDraftComposer() {
    const seeds = [];
    for (const signal of TOOLBAR_SIGNALS) {
      for (const selector of signal.selectors) {
        try {
          seeds.push(...document.querySelectorAll(selector));
        } catch (_error) {
          // ignore
        }
      }
    }

    const seen = new Set();
    for (const seed of seeds) {
      const button = seed.closest?.("button, [role='button']") || seed;
      const scope =
        findComposerAnchor(button) ||
        button.closest?.(".share-creation-state, form, section") ||
        button.parentElement;
      if (!scope || seen.has(scope)) {
        continue;
      }
      seen.add(scope);

      const { hits } = countToolbarHits(scope);
      if (hits < MIN_TOOLBAR_HITS) {
        continue;
      }
      if (!isVisible(scope) && !isVisible(button)) {
        continue;
      }

      const composer = findComposerAnchor(scope) || scope;
      const editor = findEditorIn(composer) || findEditorIn(scope);
      if (editor && (isCommentEditor(editor) || isFeedPostEditor(editor))) {
        continue;
      }
      return { composer, editor: editor || null, hits };
    }

    return null;
  }

  function hideStatsHud() {
    if (typeof AIBlocker.setStatsHudVisible === "function") {
      AIBlocker.setStatsHudVisible(false);
    }
  }

  function showStatsHud() {
    if (typeof AIBlocker.setStatsHudVisible === "function") {
      AIBlocker.setStatsHudVisible(true);
    }
  }

  function readDraft(editor) {
    return AIBlocker.text.normalize(editor?.innerText || editor?.textContent || "");
  }

  function ensureHost() {
    if (host?.isConnected) {
      return false;
    }
    host = document.createElement("div");
    host.setAttribute("data-ai-blocker", "coach");
    const shadow = host.attachShadow({ mode: "closed" });
    const style = document.createElement("style");
    style.textContent = CSS;

    const root = document.createElement("div");
    root.className = "ai-blocker-coach";
    root.setAttribute("role", "region");
    root.setAttribute("aria-label", "Draft overview");

    const kicker = document.createElement("p");
    kicker.className = "ai-blocker-overlay__kicker";
    kicker.textContent = "linkedin ai blocker";

    const title = document.createElement("p");
    title.className = "ai-blocker-overlay__title";
    title.textContent = "Draft overview";

    const toggles = document.createElement("div");
    toggles.className = "ai-blocker-overlay__toggles";

    scoreTileEl = document.createElement("div");
    scoreTileEl.className = "ai-blocker-overlay__toggle";
    const scoreLabel = document.createElement("span");
    scoreLabel.className = "ai-blocker-overlay__toggle-label";
    scoreLabel.textContent = "score";
    scoreValueEl = document.createElement("span");
    scoreValueEl.className = "ai-blocker-overlay__toggle-value";
    scoreValueEl.textContent = "0";
    scoreTileEl.append(scoreLabel, scoreValueEl);

    const paramsTile = document.createElement("div");
    paramsTile.className = "ai-blocker-overlay__toggle";
    const paramsLabel = document.createElement("span");
    paramsLabel.className = "ai-blocker-overlay__toggle-label";
    paramsLabel.textContent = "parameters";
    paramsValueEl = document.createElement("span");
    paramsValueEl.className = "ai-blocker-overlay__toggle-value";
    paramsValueEl.textContent = "0/6";
    paramsTile.append(paramsLabel, paramsValueEl);

    toggles.append(scoreTileEl, paramsTile);

    hintEl = document.createElement("p");
    hintEl.className = "ai-blocker-coach__hint";

    flagsEl = document.createElement("div");
    flagsEl.className = "ai-blocker-coach__flags";

    root.append(kicker, title, toggles, hintEl, flagsEl);
    shadow.append(style, root);
    document.documentElement.appendChild(host);
    return true;
  }

  function unmount() {
    lastText = null;
    openFlagName = null;
    composerEl = null;
    detachEditor();
    if (host) {
      host.remove();
      host = null;
      scoreValueEl = null;
      paramsValueEl = null;
      scoreTileEl = null;
      hintEl = null;
      flagsEl = null;
    }
  }

  function endComposerSession() {
    composerActive = false;
    closeMisses = 0;
    unmount();
    showStatsHud();
  }

  function detachEditor() {
    if (editorObserver) {
      editorObserver.disconnect();
      editorObserver = null;
    }
    if (editorEl) {
      editorEl.removeEventListener("input", scheduleScore);
      editorEl.removeEventListener("paste", scheduleScore);
      editorEl.removeEventListener("keyup", scheduleScore);
      editorEl.removeEventListener("compositionend", scheduleScore);
      editorEl.removeEventListener("focus", scheduleScore);
      editorEl = null;
    }
  }

  function attachEditor(editor) {
    if (editorEl === editor) {
      return;
    }
    detachEditor();
    editorEl = editor;
    editorEl.addEventListener("input", scheduleScore);
    editorEl.addEventListener("paste", scheduleScore);
    editorEl.addEventListener("keyup", scheduleScore);
    editorEl.addEventListener("compositionend", scheduleScore);
    editorEl.addEventListener("focus", scheduleScore);
    editorObserver = new MutationObserver(scheduleScore);
    editorObserver.observe(editorEl, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    scoreNow();
  }

  function getModalRect() {
    if (composerEl && isVisible(composerEl)) {
      return composerEl.getBoundingClientRect();
    }
    return null;
  }

  function positionHost() {
    if (!host) {
      return;
    }
    const margin = 8;
    const vw = window.innerWidth || document.documentElement.clientWidth;
    const vh = window.innerHeight || document.documentElement.clientHeight;
    const rect = getModalRect();

    if (!rect || rect.width < 40 || rect.height < 40) {
      host.style.left = `${Math.max(margin, vw - COACH_WIDTH - 24)}px`;
      host.style.top = "96px";
      host.style.height = "";
      return;
    }

    const panelHeight = Math.round(rect.height);
    host.style.height = `${panelHeight}px`;

    const rightLeft = rect.right + GAP;
    const leftLeft = rect.left - GAP - COACH_WIDTH;
    let left;
    if (rightLeft + COACH_WIDTH <= vw - margin) {
      left = rightLeft;
    } else if (leftLeft >= margin) {
      left = leftLeft;
    } else {
      left = rightLeft;
    }

    let top = rect.top;
    if (top + panelHeight > vh - margin) {
      top = Math.max(margin, vh - panelHeight - margin);
    }
    if (top < margin) {
      top = margin;
    }

    host.style.left = `${Math.round(left)}px`;
    host.style.top = `${Math.round(top)}px`;
  }

  function renderVerdict(verdict, tooShort) {
    ensureHost();
    const ui = AIBlocker.overlayUi;
    const total = verdict.parameterCount ?? ui?.DETECTOR_ORDER?.length ?? 6;
    const score = verdict.ai_score ?? 0;
    const hit = verdict.parametersHit ?? 0;
    scoreValueEl.textContent = String(score);
    paramsValueEl.textContent = `${hit}/${total}`;
    scoreTileEl.classList.toggle("is-flagged", Boolean(verdict.flagged));
    hintEl.textContent = tooShort
      ? "Keep writing. Scoring starts after a short draft."
      : "";
    hintEl.hidden = !tooShort;

    if (tooShort || !ui) {
      flagsEl.replaceChildren();
    } else {
      const list = ui.buildFlagList(ui.orderedResults(verdict), "params", openFlagName);
      list.addEventListener("ai-blocker-flag-open", (event) => {
        openFlagName = event.detail?.name || null;
      });
      flagsEl.replaceChildren(list);
    }
    positionHost();
  }

  function scoreNow() {
    if (!editorEl) {
      return;
    }
    const value = readDraft(editorEl);
    if (value === lastText && host?.isConnected) {
      positionHost();
      return;
    }
    lastText = value;
    const tooShort = value.length < (SETTINGS.minTextLength || 80);
    const verdict = tooShort ? emptyVerdict() : AIBlocker.runDetectors(value);
    renderVerdict(verdict, tooShort);
  }

  function scheduleScore() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(scoreNow, DEBOUNCE_MS);
  }

  function mountCoach(match) {
    composerEl = match.composer;
    const remounted = ensureHost();
    if (SETTINGS.debug && remounted) {
      console.info("[AI Blocker] draft overview mounted", {
        hits: match.hits,
        hasEditor: Boolean(match.editor),
      });
    }
    if (match.editor && !isCommentEditor(match.editor) && !isFeedPostEditor(match.editor)) {
      attachEditor(match.editor);
      if (remounted) {
        lastText = null;
        scoreNow();
      }
    } else {
      detachEditor();
      lastText = null;
      renderVerdict(emptyVerdict(), true);
    }
    positionHost();
    requestAnimationFrame(() => {
      positionHost();
      requestAnimationFrame(positionHost);
    });
  }

  function sync() {
    const match = findDraftComposer();

    if (match) {
      composerActive = true;
      closeMisses = 0;
      hideStatsHud();
      mountCoach(match);
      return;
    }

    if (composerActive || host) {
      closeMisses += 1;
      if (closeMisses < CLOSE_MISS_LIMIT) {
        hideStatsHud();
        return;
      }
      if (SETTINGS.debug) {
        console.info("[AI Blocker] draft closed — restoring session summary");
      }
      endComposerSession();
      return;
    }

    showStatsHud();
  }

  function requestComposerCloseCheck() {
    closeMisses = Math.max(closeMisses, CLOSE_MISS_LIMIT - 1);
    const delays = [0, 80, 200, 450, 900];
    for (const delay of delays) {
      setTimeout(() => {
        if (!findDraftComposer()) {
          endComposerSession();
        } else {
          sync();
        }
      }, delay);
    }
  }

  function isEventOnCoach(event) {
    const path = typeof event.composedPath === "function" ? event.composedPath() : [event.target];
    return path.some(
      (el) => el === host || el?.getAttribute?.("data-ai-blocker") === "coach",
    );
  }

  function isEventOnShareModal(event) {
    const path = typeof event.composedPath === "function" ? event.composedPath() : [event.target];
    return path.some((el) => {
      if (!el || el.nodeType !== 1) {
        return false;
      }
      if (el === composerEl) {
        return true;
      }
      return Boolean(
        el.classList?.contains?.("share-box-v2__modal") ||
          el.classList?.contains?.("share-creation-state") ||
          el.hasAttribute?.("data-test-modal") ||
          el.getAttribute?.("aria-labelledby") === "share-to-linkedin-modal__header" ||
          countToolbarHits(el).hits >= MIN_TOOLBAR_HITS,
      );
    });
  }

  function isBackdropDismissTarget(event) {
    const path = typeof event.composedPath === "function" ? event.composedPath() : [event.target];
    return path.some(
      (el) =>
        el?.classList?.contains?.("artdeco-modal-overlay") ||
        el?.classList?.contains?.("modal__overlay") ||
        (typeof el?.className === "string" && el.className.includes("modal-overlay")),
    );
  }

  function debounce(fn, waitMs) {
    let timer = 0;
    return function () {
      clearTimeout(timer);
      timer = setTimeout(fn, waitMs);
    };
  }

  AIBlocker.syncComposerCoach = sync;

  AIBlocker.startComposerCoach = function startComposerCoach() {
    if (started) {
      sync();
      return;
    }
    started = true;
    const schedule = debounce(sync, SETTINGS.scanDebounceMs || 300);

    document.addEventListener(
      "click",
      (event) => {
        if (findDraftComposer()) {
          sync();
          return;
        }

        const path = typeof event.composedPath === "function" ? event.composedPath() : [event.target];
        const dismiss = path.find((el) =>
          el?.matches?.(
            '[data-test-modal-close-btn], .artdeco-modal__dismiss, button[aria-label="Dismiss"]',
          ),
        );
        if (dismiss && (composerActive || host)) {
          requestComposerCloseCheck();
          return;
        }

        if (composerActive || host) {
          if (isEventOnCoach(event)) {
            return;
          }
          if (isBackdropDismissTarget(event) || !isEventOnShareModal(event)) {
            requestComposerCloseCheck();
          }
        }
      },
      true,
    );

    document.addEventListener(
      "keydown",
      (event) => {
        if (event.key !== "Escape") {
          return;
        }
        if (composerActive || host) {
          requestComposerCloseCheck();
        }
      },
      true,
    );

    document.addEventListener(
      "focusin",
      () => {
        if (findDraftComposer()) {
          sync();
        }
      },
      true,
    );

    const observer = new MutationObserver(schedule);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.addEventListener("hashchange", schedule, true);
    window.addEventListener("popstate", schedule, true);
    window.addEventListener("pageshow", schedule, true);
    document.addEventListener("visibilitychange", schedule, true);
    window.addEventListener("resize", positionHost, true);
    window.addEventListener("scroll", positionHost, true);
    setInterval(sync, 800);
    sync();
  };
})();
