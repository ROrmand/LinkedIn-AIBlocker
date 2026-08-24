var AIBlocker = AIBlocker || {};

(function () {
  const SETTINGS = AIBlocker.SETTINGS;
  const COACH_WIDTH = 280;
  const GAP = 12;
  const DEBOUNCE_MS = 200;
  const BURST_MS = [0, 50, 120, 250, 500, 900, 1500, 2500];

  // Prefer stable attrs; class names drift with LinkedIn CSS-in-JS hashes.
  const COMPOSER_ROOT_SELECTORS = [
    ".share-box-v2__modal",
    '[data-test-modal][role="dialog"]',
    ".share-creation-state",
    ".share-box-modal",
    ".share-box-feed-entry__container",
    ".share-box",
    ".artdeco-modal.share-box-v2__modal",
    '[role="dialog"]',
    '[aria-modal="true"]',
    "[data-test-modal]",
    "[data-test-modal-id]",
  ];
  const COMPOSER_SELECTORS = COMPOSER_ROOT_SELECTORS;
  const EDITOR_SELECTORS = [
    '.ql-editor[contenteditable="true"]',
    '[data-test-ql-editor-contenteditable="true"]',
    '[role="textbox"][contenteditable="true"]',
    '.share-creation-state__text-editor [contenteditable="true"]',
    'div[data-placeholder*="What do you want to talk about"]',
    'div[data-placeholder*="talk about"]',
    'div[aria-placeholder*="What do you want to talk about"]',
    'div[aria-placeholder*="talk about"]',
  ];
  const TRIGGER_SELECTORS = [
    ".share-box-feed-entry__trigger",
    '[data-test-id="share-box-feed-entry__trigger"]',
    '[data-test-id="share-box-feed-entrytrigger"]',
    '[data-test-share-box-trigger]',
    ".share-box-feed-entry__top-bar",
    ".share-box-feed-entry__closed-share-box",
    'button[aria-label="Start a post"]',
    'button[aria-label*="Start a post"]',
  ];
  const COMMENT_ANCESTOR =
    ".comments-comment-box, .comments-comment-texteditor, [data-view-name='feed-comment']";
  const FEED_POST_ANCESTOR =
    '.feed-shared-update-v2, [data-view-name="feed-full-update"], [data-view-name="feed-mini-update"], [data-view-name="feed-commentary"]';
  const COMPOSER_MARKERS = [
    ".share-actions__primary-action",
    ".share-creation-state__text-editor",
    ".share-creation-state__footer",
    ".share-box_actions",
    'button.share-actions__primary-action',
    "#share-to-linkedin-modal__header",
  ];
  const PENDING_MS = 8000;
  const LOST_GRACE_MS = 2500;
  const CLOSE_MISS_LIMIT = 3;

  const CSS = `
    :host {
      all: initial;
      position: fixed !important;
      z-index: 2147483001 !important;
      pointer-events: auto !important;
      display: block !important;
      width: ${COACH_WIDTH}px !important;
    }
    .ai-blocker-coach {
      box-sizing: border-box;
      width: 100%;
      max-height: calc(100vh - 16px);
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
  let burstTimers = [];
  let lastText = null;
  let started = false;
  let composerPendingUntil = 0;
  let lastSeenComposerAt = 0;
  let composerActive = false;
  let closeMisses = 0;
  // Live node refs from click/focus events (works even when querySelector misses).
  let forcedMatch = null;

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
    const viewHeight = window.innerHeight || document.documentElement.clientHeight;
    const viewWidth = window.innerWidth || document.documentElement.clientWidth;
    // Share modal can report a small editor rect while chrome is still laying out.
    if (rect.width < 8 || rect.height < 8) {
      return false;
    }
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

  function looksLikeComposer(root) {
    if (!root) {
      return false;
    }
    for (const selector of COMPOSER_MARKERS) {
      try {
        if (root.matches?.(selector) || root.querySelector?.(selector)) {
          return true;
        }
      } catch (_error) {
        // ignore invalid selector scope
      }
    }
    return false;
  }

  function placeholderLooksLikeShare(editor) {
    const attrs = [
      editor?.getAttribute?.("data-placeholder"),
      editor?.getAttribute?.("aria-placeholder"),
      editor?.getAttribute?.("aria-label"),
    ];
    const blob = attrs.filter(Boolean).join(" ").toLowerCase();
    return (
      blob.includes("talk about") ||
      blob.includes("start a post") ||
      blob.includes("share an update") ||
      blob.includes("what do you want") ||
      blob.includes("text editor for creating content")
    );
  }

  function findShareRoot(element) {
    if (!element) {
      return null;
    }
    for (const selector of COMPOSER_ROOT_SELECTORS) {
      try {
        const root = element.closest(selector);
        if (root) {
          return root;
        }
      } catch (_error) {
        // ignore invalid selector
      }
    }
    let node = element.parentElement;
    while (node && node !== document.body && node !== document.documentElement) {
      if (
        node.getAttribute?.("role") === "dialog" ||
        node.hasAttribute?.("data-test-modal") ||
        node.classList?.contains("share-box-v2__modal") ||
        node.getAttribute?.("aria-modal") === "true" ||
        looksLikeComposer(node)
      ) {
        return node;
      }
      node = node.parentElement;
    }
    return null;
  }

  function markComposerPending() {
    // Opening only — do not mark composerActive until the modal is actually in the DOM.
    // Burst sync would otherwise count "misses" and restore the HUD before LinkedIn mounts it.
    composerPendingUntil = Date.now() + PENDING_MS;
    closeMisses = 0;
    hideStatsHud();
  }

  function rememberForcedMatch(composer, editor) {
    if (!composer && !editor) {
      return;
    }
    forcedMatch = {
      composer: composer || editor,
      editor: editor || null,
    };
    composerActive = true;
    lastSeenComposerAt = Date.now();
    composerPendingUntil = Math.max(composerPendingUntil, Date.now() + PENDING_MS);
    hideStatsHud();
  }

  function clearForcedMatch() {
    forcedMatch = null;
  }

  function matchFromComposedPath(event) {
    const path = typeof event.composedPath === "function" ? event.composedPath() : [event.target];
    let editor = null;
    let composer = null;
    for (const el of path) {
      if (!el || el.nodeType !== 1) {
        continue;
      }
      try {
        if (
          !editor &&
          (el.matches?.(
            '.ql-editor[contenteditable="true"], [role="textbox"][contenteditable="true"], [data-test-ql-editor-contenteditable="true"]',
          ) ||
            placeholderLooksLikeShare(el))
        ) {
          if (!el.classList?.contains("ql-clipboard") && !isCommentEditor(el) && !isFeedPostEditor(el)) {
            editor = el;
          }
        }
        if (
          !composer &&
          (el.getAttribute?.("role") === "dialog" ||
            el.classList?.contains("share-box-v2__modal") ||
            el.classList?.contains("share-creation-state") ||
            el.hasAttribute?.("data-test-modal") ||
            el.getAttribute?.("aria-labelledby") === "share-to-linkedin-modal__header" ||
            el.id === "share-to-linkedin-modal__header")
        ) {
          composer = el.id === "share-to-linkedin-modal__header" ? el.closest?.('[role="dialog"]') || el : el;
        }
      } catch (_error) {
        // ignore
      }
    }
    if (!composer && editor) {
      composer = findShareRoot(editor) || editor;
    }
    if (composer || editor) {
      return { composer: composer || editor, editor };
    }
    return null;
  }

  function findComposerFromViewport() {
    const points = [
      [0.5, 0.35],
      [0.5, 0.45],
      [0.5, 0.55],
      [0.4, 0.4],
      [0.6, 0.4],
    ];
    const seen = new Set();
    for (const [px, py] of points) {
      let stack;
      try {
        stack = document.elementsFromPoint(
          Math.round(window.innerWidth * px),
          Math.round(window.innerHeight * py),
        );
      } catch (_error) {
        continue;
      }
      for (const el of stack) {
        if (!el || seen.has(el)) {
          continue;
        }
        seen.add(el);
        const dialog =
          el.closest?.(
            '.share-box-v2__modal, [data-test-modal][role="dialog"], [aria-labelledby="share-to-linkedin-modal__header"], [role="dialog"]',
          ) || null;
        if (!dialog) {
          continue;
        }
        const editor = findEditorIn(dialog);
        if (
          dialog.classList?.contains("share-box-v2__modal") ||
          dialog.hasAttribute?.("data-test-modal") ||
          dialog.querySelector?.(".share-creation-state, .share-actions__primary-action") ||
          (editor && placeholderLooksLikeShare(editor)) ||
          (dialog.textContent || "").includes("What do you want to talk about")
        ) {
          return { composer: dialog, editor };
        }
      }
    }
    return null;
  }

  function findComposerFromDialogs() {
    let dialogs;
    try {
      dialogs = document.querySelectorAll('[role="dialog"], [data-test-modal], .artdeco-modal');
    } catch (_error) {
      return null;
    }
    for (const dialog of dialogs) {
      const text = dialog.textContent || "";
      const labelled =
        dialog.getAttribute("aria-labelledby") === "share-to-linkedin-modal__header" ||
        Boolean(dialog.querySelector("#share-to-linkedin-modal__header"));
      const shareText =
        text.includes("What do you want to talk about") ||
        text.includes("Create post") ||
        text.includes("Post to Anyone");
      if (!labelled && !shareText && !dialog.classList?.contains("share-box-v2__modal")) {
        continue;
      }
      const editor = findEditorIn(dialog);
      return { composer: dialog, editor };
    }
    return null;
  }

  function getForcedMatch() {
    if (!forcedMatch) {
      return null;
    }
    const composerOk = forcedMatch.composer?.isConnected && isVisible(forcedMatch.composer);
    const editorOk = forcedMatch.editor?.isConnected && isVisible(forcedMatch.editor);
    if (!composerOk && !editorOk) {
      // Hidden or detached — LinkedIn closed/dismissed the overlay.
      forcedMatch = null;
      return null;
    }
    if (!forcedMatch.composer?.isConnected && forcedMatch.editor?.isConnected) {
      forcedMatch.composer = findShareRoot(forcedMatch.editor) || forcedMatch.editor;
    }
    if (forcedMatch.composer?.isConnected && !forcedMatch.editor?.isConnected) {
      forcedMatch.editor = findEditorIn(forcedMatch.composer);
    }
    return forcedMatch;
  }

  function clearComposerPending() {
    composerPendingUntil = 0;
  }

  function isComposerPending() {
    return Date.now() < composerPendingUntil;
  }

  function isComposerRecentlySeen() {
    return lastSeenComposerAt > 0 && Date.now() - lastSeenComposerAt < LOST_GRACE_MS;
  }

  function queryShareModalRoot() {
    try {
      return (
        document.querySelector(".share-box-v2__modal") ||
        document.querySelector('[aria-labelledby="share-to-linkedin-modal__header"]') ||
        document.querySelector('[data-test-modal][role="dialog"] .share-creation-state')?.closest("[role='dialog'], [data-test-modal]") ||
        document.querySelector(".share-creation-state__share-box-v2")?.closest("[role='dialog'], .artdeco-modal") ||
        null
      );
    } catch (_error) {
      return null;
    }
  }

  // True only while the create-post overlay is actually on screen.
  function isShareModalPresent() {
    if (getForcedMatch()) {
      return true;
    }
    try {
      const root = queryShareModalRoot();
      if (root && isVisible(root)) {
        return true;
      }
      const header = document.getElementById("share-to-linkedin-modal__header");
      if (header) {
        const dialog = header.closest('[role="dialog"], .artdeco-modal, .share-box-v2__modal');
        if (dialog && isVisible(dialog)) {
          return true;
        }
      }
      const editor = document.querySelector(
        '.ql-editor[data-placeholder*="What do you want to talk about"], .ql-editor[aria-placeholder*="What do you want to talk about"]',
      );
      if (editor && isVisible(editor) && !isCommentEditor(editor) && !isFeedPostEditor(editor)) {
        return true;
      }
    } catch (error) {
      if (SETTINGS.debug) {
        console.warn("[AI Blocker] isShareModalPresent error", error);
      }
      return false;
    }
    return false;
  }

  function logDetectDebug(reason) {
    if (!SETTINGS.debug) {
      return;
    }
    let dialogs = 0;
    let shareModals = 0;
    let headers = 0;
    try {
      dialogs = document.querySelectorAll('[role="dialog"]').length;
      shareModals = document.querySelectorAll(".share-box-v2__modal").length;
      headers = document.querySelectorAll("#share-to-linkedin-modal__header").length;
    } catch (_error) {
      // ignore
    }
    console.debug("[AI Blocker] detect", {
      reason,
      dialogs,
      shareModals,
      headers,
      forced: Boolean(getForcedMatch()),
      activeTag: document.activeElement?.tagName,
      activeClass: document.activeElement?.className,
    });
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

  function findEditorIn(root) {
    for (const selector of EDITOR_SELECTORS) {
      let nodes;
      try {
        nodes = root.querySelectorAll(selector);
      } catch (_error) {
        continue;
      }
      for (const node of nodes) {
        if (isCommentEditor(node) || isFeedPostEditor(node)) {
          continue;
        }
        // Skip Quill's hidden clipboard mirror.
        if (node.classList?.contains("ql-clipboard")) {
          continue;
        }
        return node;
      }
    }
    return null;
  }

  function findComposerFromModal() {
    let modals;
    try {
      modals = document.querySelectorAll(
        [
          ".share-box-v2__modal",
          '[data-test-modal][role="dialog"]',
          '[role="dialog"].artdeco-modal',
          ".share-creation-state",
        ].join(", "),
      );
    } catch (_error) {
      modals = document.querySelectorAll(".share-creation-state, [role='dialog']");
    }

    for (const modal of modals) {
      if (!modal?.isConnected) {
        continue;
      }
      const editor = findEditorIn(modal);
      const shareLike =
        looksLikeComposer(modal) ||
        modal.classList?.contains("share-box-v2__modal") ||
        modal.hasAttribute?.("data-test-modal") ||
        Boolean(modal.querySelector?.(".share-creation-state, .share-actions__primary-action")) ||
        (editor && placeholderLooksLikeShare(editor));

      if (!shareLike) {
        continue;
      }
      // Do not require isVisible for known share modals — LinkedIn animates them in.
      const knownShare =
        modal.classList?.contains("share-box-v2__modal") ||
        modal.hasAttribute?.("data-test-modal") ||
        modal.getAttribute?.("aria-labelledby") === "share-to-linkedin-modal__header";
      if (!knownShare && !isVisible(modal) && !(editor && isVisible(editor))) {
        continue;
      }
      if (editor && (isCommentEditor(editor) || isFeedPostEditor(editor))) {
        continue;
      }
      return { composer: modal, editor };
    }
    return null;
  }

  function findComposerViaEditor() {
    let editors;
    try {
      editors = document.querySelectorAll(EDITOR_SELECTORS.join(", "));
    } catch (_error) {
      editors = document.querySelectorAll('.ql-editor[contenteditable="true"]');
    }

    for (const editor of editors) {
      if (isCommentEditor(editor) || isFeedPostEditor(editor)) {
        continue;
      }
      if (editor.classList?.contains("ql-clipboard")) {
        continue;
      }
      if (!isVisible(editor) && !placeholderLooksLikeShare(editor)) {
        continue;
      }
      const root = findShareRoot(editor);
      if (!root) {
        if (placeholderLooksLikeShare(editor)) {
          return {
            composer: editor.closest('[role="dialog"], [data-test-modal], .share-box-v2__modal, form, section, div') || editor,
            editor,
          };
        }
        continue;
      }
      const closedShell =
        root.matches?.(".share-box-feed-entry__closed-share-box, .share-box-feed-entry__trigger") ||
        (Boolean(root.querySelector?.(".share-box-feed-entry__trigger")) &&
          !looksLikeComposer(root) &&
          !placeholderLooksLikeShare(editor) &&
          !root.classList?.contains("share-box-v2__modal") &&
          !root.hasAttribute?.("data-test-modal"));
      if (closedShell) {
        continue;
      }
      return { composer: root, editor };
    }
    return null;
  }

  function findComposer() {
    const forced = getForcedMatch();
    if (forced) {
      return forced;
    }

    const fromViewport = findComposerFromViewport();
    if (fromViewport) {
      return fromViewport;
    }

    const fromDialogs = findComposerFromDialogs();
    if (fromDialogs) {
      return fromDialogs;
    }

    const fromModal = findComposerFromModal();
    if (fromModal) {
      return fromModal;
    }

    const viaEditor = findComposerViaEditor();
    if (viaEditor) {
      return viaEditor;
    }

    for (const selector of COMPOSER_SELECTORS) {
      let nodes;
      try {
        nodes = document.querySelectorAll(selector);
      } catch (_error) {
        continue;
      }
      for (const node of nodes) {
        if (isCommentEditor(node) || !isVisible(node)) {
          continue;
        }
        if (
          node.querySelector?.(".share-box-feed-entry__trigger") &&
          !findEditorIn(node) &&
          !looksLikeComposer(node)
        ) {
          continue;
        }
        const editor = findEditorIn(node);
        if (editor || looksLikeComposer(node)) {
          return { composer: node, editor };
        }
      }
    }

    return null;
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
    root.setAttribute("aria-label", "Draft AI-writing score");

    const kicker = document.createElement("p");
    kicker.className = "ai-blocker-overlay__kicker";
    kicker.textContent = "linkedin ai blocker";

    const title = document.createElement("p");
    title.className = "ai-blocker-overlay__title";
    title.textContent = "Draft check";

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
    clearComposerPending();
    lastSeenComposerAt = 0;
    clearForcedMatch();
    unmount();
    showStatsHud();
  }

  function mountCoach(match) {
    const composer = match?.composer;
    const editor = match?.editor || null;
    if (composer) {
      composerEl = getComposerAnchor(composer) || composer;
    }
    const remounted = ensureHost();
    if (SETTINGS.debug && remounted) {
      console.info("[AI Blocker] draft coach mounted", {
        composer: composerEl?.className || composerEl?.tagName || "(none)",
        hasEditor: Boolean(editor),
      });
    }
    if (editor && !isCommentEditor(editor) && !isFeedPostEditor(editor)) {
      attachEditor(editor);
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

  function getComposerAnchor(el) {
    if (!el?.closest) {
      return el || null;
    }
    return (
      el.closest(
        '.share-box-v2__modal, [aria-labelledby="share-to-linkedin-modal__header"], [data-test-modal][role="dialog"], [role="dialog"]',
      ) || el
    );
  }

  function getModalRect() {
    const live = queryShareModalRoot();
    if (live && isVisible(live)) {
      return live.getBoundingClientRect();
    }
    const anchor = getComposerAnchor(composerEl);
    if (anchor && isVisible(anchor)) {
      return anchor.getBoundingClientRect();
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
      return;
    }

    const height = host.offsetHeight || 240;
    const rightLeft = rect.right + GAP;
    const leftLeft = rect.left - GAP - COACH_WIDTH;

    let left;
    // Never cover the post modal: only sit fully to the right or fully to the left.
    if (rightLeft + COACH_WIDTH <= vw - margin) {
      left = rightLeft;
    } else if (leftLeft >= margin) {
      left = leftLeft;
    } else {
      // Prefer hanging off the right edge of the viewport over overlapping the modal.
      left = rightLeft;
    }

    // Align top edge with the post window.
    let top = rect.top;
    if (top + height > vh - margin) {
      top = Math.max(margin, vh - height - margin);
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

  function sync() {
    let match = findComposer();
    const modalPresent = Boolean(match) || isShareModalPresent();

    if (modalPresent || match) {
      composerActive = true;
      closeMisses = 0;
      lastSeenComposerAt = Date.now();
      composerPendingUntil = Math.max(composerPendingUntil, Date.now() + PENDING_MS);
      hideStatsHud();

      if (!match) {
        match =
          findComposerFromViewport() ||
          findComposerFromDialogs() ||
          findComposerFromModal() ||
          findComposerViaEditor();
      }
      if (match) {
        rememberForcedMatch(match.composer, match.editor);
        mountCoach(match);
      } else {
        ensureHost();
        if (SETTINGS.debug) {
          console.info("[AI Blocker] draft coach shell (modal present, editor not bound)");
          logDetectDebug("shell");
        }
        renderVerdict(emptyVerdict(), true);
        positionHost();
      }
      return;
    }

    if (isComposerPending()) {
      hideStatsHud();
      closeMisses = 0;
      const speculative = findComposerFromViewport() || findComposerFromDialogs();
      if (speculative) {
        rememberForcedMatch(speculative.composer, speculative.editor);
        mountCoach(speculative);
        return;
      }
      logDetectDebug("waiting");
      return;
    }

    if (composerActive || isComposerRecentlySeen() || host || composerEl || forcedMatch) {
      closeMisses += 1;
      clearForcedMatch();
      if (closeMisses < CLOSE_MISS_LIMIT) {
        hideStatsHud();
        if (SETTINGS.debug) {
          console.debug("[AI Blocker] composer miss", closeMisses, "/", CLOSE_MISS_LIMIT);
        }
        return;
      }
      if (SETTINGS.debug) {
        console.info("[AI Blocker] composer closed — restoring session summary");
      }
      endComposerSession();
      return;
    }

    showStatsHud();
  }

  function requestComposerCloseCheck() {
    composerPendingUntil = 0;
    clearForcedMatch();
    closeMisses = Math.max(closeMisses, CLOSE_MISS_LIMIT - 1);
    const delays = [0, 80, 200, 450, 900];
    for (const delay of delays) {
      setTimeout(() => {
        if (!isShareModalPresent()) {
          endComposerSession();
        } else {
          sync();
        }
      }, delay);
    }
  }

  function isEventOnShareModal(event) {
    const path = typeof event.composedPath === "function" ? event.composedPath() : [event.target];
    return path.some(
      (el) =>
        el?.classList?.contains?.("share-box-v2__modal") ||
        el?.classList?.contains?.("share-creation-state") ||
        el?.classList?.contains?.("share-box") ||
        el?.hasAttribute?.("data-test-modal") ||
        el?.getAttribute?.("aria-labelledby") === "share-to-linkedin-modal__header" ||
        el?.id === "share-to-linkedin-modal__header",
    );
  }

  function isEventOnCoach(event) {
    const path = typeof event.composedPath === "function" ? event.composedPath() : [event.target];
    return path.some(
      (el) => el === host || el?.getAttribute?.("data-ai-blocker") === "coach",
    );
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

  function burstSync() {
    for (const timer of burstTimers) {
      clearTimeout(timer);
    }
    burstTimers = BURST_MS.map((delay) => setTimeout(sync, delay));
    sync();
  }

  function isComposerTrigger(element) {
    if (!element?.closest) {
      return false;
    }
    for (const selector of TRIGGER_SELECTORS) {
      try {
        if (element.closest(selector)) {
          return true;
        }
      } catch (_error) {
        // ignore invalid selector
      }
    }
    const clickable = element.closest("button, [role='button'], a, .artdeco-button");
    const label = String(
      clickable?.getAttribute?.("aria-label") ||
        clickable?.getAttribute?.("title") ||
        clickable?.textContent ||
        "",
    )
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
    if (label.includes("start a post")) {
      return true;
    }
    // Feed share shell: clicking the closed composer row opens the modal.
    return Boolean(
      element.closest(
        ".share-box-feed-entry__top-bar, .share-box-feed-entry__closed-share-box, .share-box-feed-entry__trigger",
      ),
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
        const pathMatch = matchFromComposedPath(event);
        if (pathMatch && (placeholderLooksLikeShare(pathMatch.editor) || pathMatch.composer)) {
          if (
            pathMatch.composer?.classList?.contains("share-box-v2__modal") ||
            pathMatch.composer?.getAttribute?.("role") === "dialog" ||
            placeholderLooksLikeShare(pathMatch.editor)
          ) {
            rememberForcedMatch(pathMatch.composer, pathMatch.editor);
            burstSync();
          }
        }
        if (isComposerTrigger(event.target) || isComposerTrigger(pathMatch?.composer)) {
          markComposerPending();
          burstSync();
          return;
        }

        const path = typeof event.composedPath === "function" ? event.composedPath() : [event.target];
        const dismiss = path.find(
          (el) =>
            el?.matches?.(
              '[data-test-modal-close-btn], .artdeco-modal__dismiss, button[aria-label="Dismiss"]',
            ),
        );
        if (dismiss && (isEventOnShareModal(event) || composerActive || forcedMatch || host)) {
          requestComposerCloseCheck();
          return;
        }

        // Click outside the create-post modal (dimmed backdrop / feed) dismisses LinkedIn's overlay.
        if (composerActive || forcedMatch || host) {
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
        if (composerActive || forcedMatch || host) {
          requestComposerCloseCheck();
        }
      },
      true,
    );

    document.addEventListener(
      "focusin",
      (event) => {
        const pathMatch = matchFromComposedPath(event);
        if (pathMatch?.editor && !isCommentEditor(pathMatch.editor) && !isFeedPostEditor(pathMatch.editor)) {
          if (placeholderLooksLikeShare(pathMatch.editor) || findShareRoot(pathMatch.editor) || pathMatch.composer) {
            rememberForcedMatch(pathMatch.composer, pathMatch.editor);
            burstSync();
            return;
          }
        }
        const target = event.target;
        if (!target?.closest) {
          return;
        }
        const editor = target.closest(
          '.ql-editor[contenteditable="true"], [role="textbox"][contenteditable="true"]',
        );
        if (!editor || isCommentEditor(editor) || isFeedPostEditor(editor)) {
          return;
        }
        if (findShareRoot(editor) || placeholderLooksLikeShare(editor)) {
          rememberForcedMatch(findShareRoot(editor), editor);
          burstSync();
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
