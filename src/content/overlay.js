var AIBlocker = AIBlocker || {};

(function () {
  const CSS = `
    :host {
      all: initial;
      position: absolute !important;
      inset: 0 !important;
      z-index: 4 !important;
      pointer-events: none !important;
      display: block !important;
    }
    .layer {
      position: absolute;
      inset: 0;
      pointer-events: none;
    }
    .ai-blocker-overlay {
      position: absolute;
      inset: 0;
      box-sizing: border-box;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0;
      padding: 16px 100px;
      border: 0;
      background: rgba(0, 0, 0, 0.72);
      color: #111;
      pointer-events: auto;
      cursor: default;
      user-select: none;
      overflow: auto;
      font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
      font-size: 15px;
      font-weight: 400;
      line-height: 1.4;
      text-align: left;
    }
    .ai-blocker-overlay__card {
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: 10px;
      width: 100%;
      margin: 0;
      padding: 16px 16px 14px;
      border: 1px solid #000;
      outline: 2px solid #000;
      outline-offset: 0;
      border-radius: 14px;
      background: #fff;
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
      margin: 4px 0 0;
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
      cursor: pointer;
      font: inherit;
      font-weight: 600;
      text-align: left;
    }
    .ai-blocker-overlay__toggle[aria-expanded="true"] {
      background: #c8c8c8;
      border-color: #000;
      color: #111;
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
    .ai-blocker-overlay__body {
      display: flex;
      flex-direction: column;
    }
    .ai-blocker-overlay__panel-slot,
    .ai-blocker-overlay__cta-slot {
      display: grid;
      transition: grid-template-rows 0.22s ease;
    }
    .ai-blocker-overlay__panel-slot {
      grid-template-rows: 0fr;
    }
    .ai-blocker-overlay.is-expanded .ai-blocker-overlay__panel-slot {
      grid-template-rows: 1fr;
    }
    .ai-blocker-overlay__cta-slot {
      grid-template-rows: 1fr;
    }
    .ai-blocker-overlay.is-expanded .ai-blocker-overlay__cta-slot {
      grid-template-rows: 0fr;
      pointer-events: none;
    }
    .ai-blocker-overlay__panel-clip,
    .ai-blocker-overlay__cta-clip {
      min-height: 0;
      overflow: hidden;
    }
    .ai-blocker-overlay__panel {
      box-sizing: border-box;
      padding: 8px 0 4px;
      border-top: 1px solid #000;
    }
    .ai-blocker-overlay__explain {
      margin: 0 0 10px;
      font-size: 0.9em;
      line-height: 1.45;
    }
    .ai-blocker-overlay__explain p {
      margin: 0 0 0.6em;
    }
    .ai-blocker-overlay__explain p:last-child {
      margin-bottom: 0;
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
    .ai-blocker-overlay__cta {
      box-sizing: border-box;
      width: 100%;
      margin: 0;
      padding: 9px 12px;
      border: 1px solid #000;
      border-radius: 10px;
      background: #111;
      color: #fff;
      cursor: pointer;
      font: inherit;
      font-weight: 700;
    }
    .ai-blocker-overlay__cta:hover,
    .ai-blocker-overlay__cta:focus-visible {
      background: #000;
      border-color: #000;
      color: #fff;
    }
    .ai-blocker-badge {
      position: absolute;
      top: 8px;
      right: 8px;
      box-sizing: border-box;
      display: flex;
      align-items: center;
      gap: 6px;
      margin: 0;
      padding: 4px 9px;
      border: 1px solid #000;
      outline: 2px solid #000;
      outline-offset: 0;
      border-radius: 999px;
      background: #fff;
      color: #111;
      pointer-events: auto;
      cursor: default;
      user-select: none;
      font-family: ui-monospace, Menlo, Consolas, monospace;
      font-size: 12px;
      font-weight: 700;
      line-height: 1.2;
      white-space: nowrap;
      z-index: 1;
    }
    .ai-blocker-badge.is-flagged {
      background: #111;
      border-color: #000;
      color: #fff;
    }
    @media (prefers-reduced-motion: reduce) {
      .ai-blocker-overlay__card,
      .ai-blocker-overlay__panel-slot,
      .ai-blocker-overlay__cta-slot,
      .ai-blocker-overlay__flag-detail-slot {
        transition: none;
      }
    }
  `;

  const STATS_CSS = `
    :host {
      all: initial;
      position: fixed !important;
      top: 72px !important;
      right: 26px !important;
      z-index: 2147483000 !important;
      pointer-events: auto !important;
      display: block !important;
    }
    .ai-blocker-stats {
      box-sizing: border-box;
      width: 17.5rem;
      margin: 0;
      padding: 16px 16px 14px;
      overflow: hidden;
      border: 1px solid #000;
      border-radius: 14px;
      background: #fff;
      color: #111;
      cursor: default;
      user-select: none;
      font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
      font-size: 13px;
      line-height: 1.35;
    }
    .ai-blocker-stats__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin: 0 0 12px;
      transition: margin 0.22s ease;
    }
    .ai-blocker-stats.is-collapsed .ai-blocker-stats__header {
      margin: 0;
    }
    .ai-blocker-stats__title {
      margin: 0;
      color: #111;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .ai-blocker-stats__toggle {
      box-sizing: border-box;
      flex-shrink: 0;
      margin: 0;
      padding: 6px 10px;
      border: 1px solid #000;
      border-radius: 8px;
      background: #fff;
      color: #111;
      cursor: pointer;
      font: inherit;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.02em;
    }
    .ai-blocker-stats__toggle:hover,
    .ai-blocker-stats__toggle:focus-visible {
      background: #111;
      color: #fff;
    }
    .ai-blocker-stats__body-slot {
      display: grid;
      grid-template-rows: 1fr;
      transition: grid-template-rows 0.22s ease;
    }
    .ai-blocker-stats.is-collapsed .ai-blocker-stats__body-slot {
      grid-template-rows: 0fr;
    }
    .ai-blocker-stats__body-clip {
      min-height: 0;
      overflow: hidden;
    }
    .ai-blocker-stats__body {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .ai-blocker-stats__row {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 16px;
      margin: 0;
    }
    .ai-blocker-stats__label {
      color: #333;
      font-size: 12px;
      font-weight: 500;
    }
    .ai-blocker-stats__value {
      font-family: ui-monospace, Menlo, Consolas, monospace;
      font-size: 18px;
      font-weight: 700;
      letter-spacing: -0.02em;
    }
    :host([hidden]),
    :host(.ai-blocker-is-hidden) {
      display: none !important;
      visibility: hidden !important;
      pointer-events: none !important;
    }
    @media (prefers-reduced-motion: reduce) {
      .ai-blocker-stats__header,
      .ai-blocker-stats__body-slot {
        transition: none;
      }
    }
  `;

  const overlays = new Map();
  const badges = new Map();
  const hosts = new Map();
  const positionedByUs = new WeakSet();
  const countedIds = new Set();
  const countedNodes = new WeakSet();
  const scanStats = { scanned: 0, flagged: 0 };
  let statsHud = null;
  let statsCollapsed = false;
  let statsHudVisible = true;
  const DETECTOR_ORDER = [
    "buzzwordDensity",
    "structuralTemplating",
    "lackOfBurstiness",
    "engagementBait",
    "sycophanticTone",
    "reportListicle",
  ];

  function ensureContainingBlock(postEl) {
    if (positionedByUs.has(postEl)) {
      return;
    }
    const position = window.getComputedStyle(postEl).position;
    if (position === "static") {
      postEl.style.position = "relative";
      positionedByUs.add(postEl);
    }
  }

  function applyPostTypography(postEl, host) {
    const type = AIBlocker.scanner.extractPostTypography(postEl);
    host.style.setProperty("--ai-font-family", type.fontFamily);
    host.style.setProperty("--ai-font-size", type.fontSize);
    host.style.setProperty("--ai-font-weight", String(type.fontWeight));
    host.style.setProperty("--ai-line-height", type.lineHeight);
  }

  function createHost(postEl) {
    const host = document.createElement("div");
    host.setAttribute("data-ai-blocker", "host");
    const shadow = host.attachShadow({ mode: "closed" });
    const style = document.createElement("style");
    style.textContent = CSS;
    const layer = document.createElement("div");
    layer.className = "layer";
    shadow.append(style, layer);
    hosts.set(postEl, { host, layer });
    return hosts.get(postEl);
  }

  function mountHost(postEl) {
    let state = hosts.get(postEl);
    if (!state) {
      state = createHost(postEl);
    }
    if (!postEl.isConnected) {
      return state;
    }
    ensureContainingBlock(postEl);
    applyPostTypography(postEl, state.host);
    if (state.host.parentNode !== postEl) {
      postEl.appendChild(state.host);
    }
    return state;
  }

  function forgetPost(postEl) {
    const state = hosts.get(postEl);
    if (state?.host) {
      state.host.remove();
    }
    hosts.delete(postEl);
    overlays.delete(postEl);
    badges.delete(postEl);
  }

  function statsPercent() {
    if (scanStats.scanned === 0) {
      return 0;
    }
    return Math.round((scanStats.flagged / scanStats.scanned) * 100);
  }

  function applyStatsCollapsed() {
    if (!statsHud?.root || !statsHud?.toggle) {
      return;
    }
    statsHud.root.classList.toggle("is-collapsed", statsCollapsed);
    statsHud.toggle.textContent = "Minimize";
    statsHud.toggle.setAttribute("aria-expanded", statsCollapsed ? "false" : "true");
    statsHud.toggle.setAttribute("aria-label", statsCollapsed ? "Expand session summary" : "Minimize session summary");
  }

  function renderStatsHud() {
    if (!statsHud?.root) {
      return;
    }
    const percent = statsPercent();
    statsHud.scanned.textContent = String(scanStats.scanned);
    statsHud.flagged.textContent = String(scanStats.flagged);
    statsHud.percent.textContent = `${percent}%`;
    applyStatsCollapsed();
    statsHud.root.setAttribute(
      "aria-label",
      `Session summary: ${scanStats.scanned} posts scanned, ${scanStats.flagged} flagged as AI, ${percent} percent of feed`
    );
  }

  function createStatsHud() {
    const host = document.createElement("div");
    host.setAttribute("data-ai-blocker", "stats");
    const shadow = host.attachShadow({ mode: "closed" });
    const style = document.createElement("style");
    style.textContent = STATS_CSS;

    const root = document.createElement("div");
    root.className = "ai-blocker-stats";
    root.setAttribute("role", "status");
    root.setAttribute("aria-live", "polite");

    const header = document.createElement("div");
    header.className = "ai-blocker-stats__header";

    const title = document.createElement("p");
    title.className = "ai-blocker-stats__title";
    title.textContent = "Session summary";

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "ai-blocker-stats__toggle";
    toggle.textContent = "Minimize";
    toggle.addEventListener("mousedown", (event) => event.stopPropagation());
    toggle.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      statsCollapsed = !statsCollapsed;
      applyStatsCollapsed();
    });

    header.append(title, toggle);

    const bodySlot = document.createElement("div");
    bodySlot.className = "ai-blocker-stats__body-slot";
    const bodyClip = document.createElement("div");
    bodyClip.className = "ai-blocker-stats__body-clip";
    const body = document.createElement("div");
    body.className = "ai-blocker-stats__body";

    function row(labelText) {
      const rowEl = document.createElement("p");
      rowEl.className = "ai-blocker-stats__row";
      const label = document.createElement("span");
      label.className = "ai-blocker-stats__label";
      label.textContent = labelText;
      const value = document.createElement("span");
      value.className = "ai-blocker-stats__value";
      value.textContent = "0";
      rowEl.append(label, value);
      return { rowEl, value };
    }

    const scannedRow = row("Posts scanned");
    const flaggedRow = row("Flagged as AI");
    const percentRow = row("Share of feed");
    percentRow.value.textContent = "0%";
    body.append(scannedRow.rowEl, flaggedRow.rowEl, percentRow.rowEl);
    bodyClip.append(body);
    bodySlot.append(bodyClip);

    root.append(header, bodySlot);
    shadow.append(style, root);

    statsHud = {
      host,
      root,
      toggle,
      scanned: scannedRow.value,
      flagged: flaggedRow.value,
      percent: percentRow.value,
    };
    renderStatsHud();
    return statsHud;
  }

  function ensureStatsHud() {
    const root = document.documentElement;
    if (!root) {
      return;
    }
    if (!statsHud?.host) {
      createStatsHud();
    }
    if (statsHud.host.parentNode !== root) {
      root.appendChild(statsHud.host);
    }
    applyStatsHudVisibility();
  }

  function applyStatsHudVisibility() {
    if (!statsHud?.host) {
      return;
    }
    const show = statsHudVisible;
    statsHud.host.hidden = !show;
    statsHud.host.classList.toggle("ai-blocker-is-hidden", !show);
    if (show) {
      statsHud.host.style.removeProperty("display");
      statsHud.host.style.removeProperty("visibility");
    } else {
      // Beat :host { display: block !important } from outside the shadow tree.
      statsHud.host.style.setProperty("display", "none", "important");
      statsHud.host.style.setProperty("visibility", "hidden", "important");
    }
  }

  AIBlocker.setStatsHudVisible = function setStatsHudVisible(visible) {
    statsHudVisible = Boolean(visible);
    applyStatsHudVisibility();
  };

  function scanKeyCounted(postEl) {
    const id = AIBlocker.scanner.getPostId(postEl);
    if (id) {
      return countedIds.has(id);
    }
    return countedNodes.has(postEl);
  }

  function markScanCounted(postEl) {
    const id = AIBlocker.scanner.getPostId(postEl);
    if (id) {
      countedIds.add(id);
      return;
    }
    countedNodes.add(postEl);
  }

  AIBlocker.ensureStatsHud = ensureStatsHud;

  AIBlocker.recordScan = function recordScan(postEl, flagged) {
    if (scanKeyCounted(postEl)) {
      return;
    }
    markScanCounted(postEl);
    scanStats.scanned += 1;
    if (flagged) {
      scanStats.flagged += 1;
    }
    ensureStatsHud();
    renderStatsHud();
  };

  AIBlocker.ensureOverlayHost = function ensureOverlayHost() {
    ensureStatsHud();
    for (const [postEl] of hosts) {
      if (!postEl.isConnected) {
        forgetPost(postEl);
        continue;
      }
      mountHost(postEl);
    }
  };

  AIBlocker.syncOverlays = function syncOverlays() {
    AIBlocker.ensureOverlayHost();
  };

  AIBlocker.hasOverlay = function hasOverlay(postEl) {
    const overlay = overlays.get(postEl);
    return Boolean(overlay && overlay.isConnected);
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function resultMap(verdict) {
    const map = new Map();
    for (const result of verdict?.results || []) {
      if (result?.name) {
        map.set(result.name, result);
      }
    }
    return map;
  }

  function orderedResults(verdict) {
    const map = resultMap(verdict);
    const names = DETECTOR_ORDER.filter((name) => map.has(name));
    for (const name of map.keys()) {
      if (!names.includes(name)) {
        names.push(name);
      }
    }
    if (!names.length) {
      return DETECTOR_ORDER.map((name) => ({
        name,
        failed: false,
        points: 0,
        signals: [],
        reason: "This post was covered without a full AI score.",
      }));
    }
    return names.map((name) => map.get(name));
  }

  function contributingResults(verdict) {
    return orderedResults(verdict).filter((result) => (result.points || 0) > 0);
  }

  function flagMeta(result, mode) {
    const points = result.points || 0;
    if (mode === "score") {
      if (result.failed) {
        return `+${points} failed`;
      }
      if (points > 0) {
        return `+${points} partial`;
      }
      return `+${points}`;
    }
    if (result.failed) {
      return "fail";
    }
    if (points > 0) {
      return `+${points}`;
    }
    return "pass";
  }

  function detailHtml(result) {
    const meaning = AIBlocker.detectorMeaning(result.name);
    const reason = String(result.reason || "").trim();
    const signals = (result.signals || []).filter(Boolean).slice(0, 6);
    const signalLine = signals.length
      ? `<p class="ai-blocker-overlay__signals">${escapeHtml(signals.join(" · "))}</p>`
      : "";
    const reasonLine = reason ? `<p>${escapeHtml(reason)}</p>` : "";
    return `<p>${escapeHtml(meaning)}</p>${reasonLine}${signalLine}`;
  }

  function scoreExplainHtml(verdict) {
    const settings = AIBlocker.SETTINGS || {};
    const threshold = settings.coverScoreThreshold ?? 25;
    const minParams = settings.coverMinParameters ?? 1;
    const score = verdict?.ai_score ?? 0;
    const hit = verdict?.parametersHit ?? 0;
    return `
      <p>Score is the sum of detector points, capped at 100. This post is <strong>${escapeHtml(score)}</strong>.</p>
      <p>A post is covered when the score is at least ${escapeHtml(threshold)} and at least ${escapeHtml(minParams)} full parameter${minParams === 1 ? "" : "s"} fire. This one hit ${escapeHtml(hit)}.</p>
      <p>Buzzwords can add +10 without counting as a failed parameter.</p>
    `;
  }

  function buildFlagList(results, mode, initialOpenName) {
    const list = document.createElement("ul");
    list.className = "ai-blocker-overlay__flags";

    if (!results.length) {
      const empty = document.createElement("li");
      empty.className = "ai-blocker-overlay__explain";
      empty.textContent =
        mode === "score"
          ? "No detectors added points on this post."
          : "No parameters were scored on this post.";
      list.appendChild(empty);
      return list;
    }

    let openName = initialOpenName || null;

    function applyOpen() {
      for (const row of list.querySelectorAll(".ai-blocker-overlay__flag")) {
        const rowBtn = row.querySelector(".ai-blocker-overlay__flag-btn");
        const rowName = row.getAttribute("data-detector");
        const isOpen = rowName === openName;
        row.classList.toggle("is-open", isOpen);
        rowBtn.setAttribute("aria-expanded", String(isOpen));
      }
    }

    for (const result of results) {
      const item = document.createElement("li");
      item.className = "ai-blocker-overlay__flag";
      item.setAttribute("data-detector", result.name);
      if (result.failed) {
        item.classList.add("is-failed");
      }

      const button = document.createElement("button");
      button.type = "button";
      button.className = "ai-blocker-overlay__flag-btn";
      button.setAttribute("aria-expanded", "false");

      const nameEl = document.createElement("span");
      nameEl.className = "ai-blocker-overlay__flag-name";
      nameEl.textContent = AIBlocker.detectorLabel(result.name);

      const metaEl = document.createElement("span");
      metaEl.className = "ai-blocker-overlay__flag-meta";
      metaEl.textContent = flagMeta(result, mode);

      button.append(nameEl, metaEl);

      const detailSlot = document.createElement("div");
      detailSlot.className = "ai-blocker-overlay__flag-detail-slot";
      const detailClip = document.createElement("div");
      detailClip.className = "ai-blocker-overlay__flag-detail-clip";
      const detail = document.createElement("div");
      detail.className = "ai-blocker-overlay__flag-detail";
      detail.innerHTML = detailHtml(result);
      detailClip.appendChild(detail);
      detailSlot.appendChild(detailClip);

      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        openName = openName === result.name ? null : result.name;
        applyOpen();
        list.dispatchEvent(
          new CustomEvent("ai-blocker-flag-open", {
            bubbles: true,
            detail: { name: openName },
          }),
        );
      });

      item.append(button, detailSlot);
      list.appendChild(item);
    }

    applyOpen();
    return list;
  }

  AIBlocker.overlayUi = {
    DETECTOR_ORDER,
    escapeHtml,
    orderedResults,
    flagMeta,
    detailHtml,
    buildFlagList,
  };

  function wireOverlay(overlay, postEl, verdict) {
    const scoreBtn = overlay.querySelector('[data-panel="score"]');
    const paramsBtn = overlay.querySelector('[data-panel="params"]');
    const panel = overlay.querySelector(".ai-blocker-overlay__panel");
    const cta = overlay.querySelector(".ai-blocker-overlay__cta");
    let openPanel = null;

    function renderPanel(name) {
      panel.replaceChildren();
      if (name === "score") {
        const explain = document.createElement("div");
        explain.className = "ai-blocker-overlay__explain";
        explain.innerHTML = scoreExplainHtml(verdict);
        panel.append(explain, buildFlagList(contributingResults(verdict), "score"));
        return;
      }
      panel.appendChild(buildFlagList(orderedResults(verdict), "params"));
    }

    function setOpen(name) {
      openPanel = openPanel === name ? null : name;
      const isOpen = Boolean(openPanel);
      scoreBtn.setAttribute("aria-expanded", String(openPanel === "score"));
      paramsBtn.setAttribute("aria-expanded", String(openPanel === "params"));
      overlay.classList.toggle("is-expanded", isOpen);
      panel.setAttribute("aria-hidden", String(!isOpen));
      cta.setAttribute("aria-hidden", String(isOpen));
      cta.tabIndex = isOpen ? -1 : 0;
      if (isOpen) {
        renderPanel(openPanel);
      }
    }

    scoreBtn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      setOpen("score");
    });
    paramsBtn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      setOpen("params");
    });
    cta.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (overlay.classList.contains("is-expanded")) {
        return;
      }
      overlay.remove();
      overlays.delete(postEl);
      AIBlocker.scanner.rememberDismissed(postEl);
    });
  }

  function overlayMarkup(verdict) {
    const score = verdict?.ai_score ?? 0;
    const hit = verdict?.parametersHit ?? 0;
    const total = verdict?.parameterCount ?? DETECTOR_ORDER.length;

    return `
      <div class="ai-blocker-overlay__card">
        <p class="ai-blocker-overlay__kicker">linkedin ai blocker</p>
        <p class="ai-blocker-overlay__title">AI SLOP DETECTED 🗣️</p>
        <div class="ai-blocker-overlay__toggles">
          <button type="button" class="ai-blocker-overlay__toggle" data-panel="score" aria-expanded="false">
            <span class="ai-blocker-overlay__toggle-label">score</span>
            <span class="ai-blocker-overlay__toggle-value">${escapeHtml(score)}</span>
          </button>
          <button type="button" class="ai-blocker-overlay__toggle" data-panel="params" aria-expanded="false">
            <span class="ai-blocker-overlay__toggle-label">parameters</span>
            <span class="ai-blocker-overlay__toggle-value">${escapeHtml(hit)}/${escapeHtml(total)}</span>
          </button>
        </div>
        <div class="ai-blocker-overlay__body">
          <div class="ai-blocker-overlay__panel-slot">
            <div class="ai-blocker-overlay__panel-clip">
              <div class="ai-blocker-overlay__panel" aria-hidden="true"></div>
            </div>
          </div>
          <div class="ai-blocker-overlay__cta-slot">
            <div class="ai-blocker-overlay__cta-clip">
              <button type="button" class="ai-blocker-overlay__cta">Show anyway</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  AIBlocker.showScoreBadge = function showScoreBadge(postEl, verdict) {
    const { layer } = mountHost(postEl);

    const score = verdict?.ai_score ?? 0;
    const hit = verdict?.parametersHit ?? 0;
    const total = verdict?.parameterCount ?? DETECTOR_ORDER.length;
    const flagged = Boolean(verdict?.flagged);
    const tooltip = [verdict?.reasoning, (verdict?.signals_detected || []).join(", ")]
      .filter(Boolean)
      .join(" — ");

    let badge = badges.get(postEl);
    if (!badge || !badge.isConnected) {
      badge = document.createElement("div");
      badge.className = "ai-blocker-badge";
      layer.appendChild(badge);
      badges.set(postEl, badge);
    }

    badge.textContent = `${score}  ${hit}/${total}`;
    badge.classList.toggle("is-flagged", flagged);
    badge.setAttribute("title", tooltip || `AI score ${score}`);
    badge.setAttribute("aria-label", `AI score ${score}, ${hit} of ${total} parameters hit`);
  };

  AIBlocker.coverPost = function coverPost(postEl, verdict) {
    if (AIBlocker.hasOverlay(postEl)) {
      return;
    }

    const { layer } = mountHost(postEl);
    const overlay = document.createElement("div");
    overlay.className = "ai-blocker-overlay";
    overlay.setAttribute("role", "region");
    overlay.setAttribute("aria-label", "AI slop detected. Show anyway to see the post.");
    overlay.innerHTML = overlayMarkup(verdict);
    overlay.addEventListener("mousedown", (event) => event.stopPropagation());
    overlay.addEventListener("click", (event) => event.stopPropagation());
    wireOverlay(overlay, postEl, verdict);

    layer.appendChild(overlay);
    overlays.set(postEl, overlay);
  };
})();
