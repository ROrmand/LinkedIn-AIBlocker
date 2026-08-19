var AIBlocker = AIBlocker || {};

(function () {
  const CSS = `
    :host {
      all: initial;
    }
    .layer,
    .badges {
      position: fixed;
      inset: 0;
      pointer-events: none;
    }
    .layer {
      z-index: 900;
    }
    .badges {
      z-index: 901;
    }
    .ai-blocker-overlay {
      position: absolute;
      box-sizing: border-box;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0;
      padding: 16px;
      border: 0;
      background: rgba(12, 12, 14, 0.82);
      color: #f4f4f5;
      pointer-events: auto;
      cursor: pointer;
      user-select: none;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      text-align: left;
    }
    .ai-blocker-overlay__card {
      box-sizing: border-box;
      width: 100%;
      max-width: 28rem;
      padding: 18px 20px 16px;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 18px;
      border-top: 3px solid #c41e3a;
      background: #16161a;
      box-shadow: 0 18px 40px rgba(0, 0, 0, 0.45);
      pointer-events: none;
    }
    .ai-blocker-overlay__kicker {
      margin: 0 0 6px;
      color: #c41e3a;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }
    .ai-blocker-overlay__title {
      margin: 0 0 10px;
      font-size: 1.35rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      line-height: 1.2;
    }
    .ai-blocker-overlay__why {
      margin: 0 0 12px;
      color: #d4d4d8;
      font-size: 0.95rem;
      line-height: 1.45;
    }
    .ai-blocker-overlay__signals {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin: 0 0 12px;
      padding: 0;
      list-style: none;
    }
    .ai-blocker-overlay__signals li {
      max-width: 100%;
      overflow: hidden;
      padding: 3px 8px;
      border: 1px solid rgba(196, 30, 58, 0.35);
      border-radius: 999px;
      background: rgba(196, 30, 58, 0.16);
      color: #fecaca;
      font-size: 11px;
      font-weight: 600;
      line-height: 1.3;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .ai-blocker-overlay__meta {
      margin: 0 0 12px;
      color: #a1a1aa;
      font-size: 12px;
      font-weight: 600;
    }
    .ai-blocker-overlay__cta {
      margin: 0;
      color: #fff;
      font-size: 0.9rem;
      font-weight: 700;
      text-decoration: underline;
      text-underline-offset: 3px;
    }
    .ai-blocker-badge {
      position: absolute;
      box-sizing: border-box;
      display: none;
      align-items: center;
      gap: 6px;
      margin: 0;
      padding: 4px 8px;
      border: 0;
      border-radius: 999px;
      background: rgba(32, 32, 32, 0.88);
      color: #fff;
      pointer-events: auto;
      cursor: default;
      user-select: none;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 12px;
      font-weight: 700;
      line-height: 1.2;
      white-space: nowrap;
    }
    .ai-blocker-badge.is-flagged {
      background: #c41e3a;
    }
  `;

  const overlays = new Map();
  const badges = new Map();
  let host = null;
  let shadow = null;
  let layer = null;
  let badgeLayer = null;

  function createHost() {
    host = document.createElement("div");
    host.setAttribute("data-ai-blocker", "host");
    host.style.cssText = "position:fixed;inset:0;z-index:900;pointer-events:none;";
    shadow = host.attachShadow({ mode: "closed" });

    const style = document.createElement("style");
    style.textContent = CSS;
    layer = document.createElement("div");
    layer.className = "layer";
    badgeLayer = document.createElement("div");
    badgeLayer.className = "badges";
    shadow.append(style, layer, badgeLayer);

    mountHost();
  }

  function mountHost() {
    const root = document.documentElement;
    if (root && host && host.parentNode !== root) {
      root.appendChild(host);
    }
  }

  AIBlocker.ensureOverlayHost = function ensureOverlayHost() {
    if (!host) {
      createHost();
      return;
    }
    if (!host.isConnected) {
      overlays.clear();
      badges.clear();
      mountHost();
    }
  };

  function getBannerBottom() {
    const nav = document.querySelector(
      "#global-nav, header.global-nav, .global-nav, header[role='banner'], [role='banner']",
    );
    if (!nav) {
      return 0;
    }
    const rect = nav.getBoundingClientRect();
    if (rect.bottom <= 0 || rect.top > 80) {
      return 0;
    }
    return Math.max(0, rect.bottom);
  }

  function clipRect(postEl) {
    const rect = postEl.getBoundingClientRect();
    const bannerBottom = getBannerBottom();
    let top = rect.top;
    let height = rect.height;

    if (top < bannerBottom) {
      height -= bannerBottom - top;
      top = bannerBottom;
    }

    return { rect, top, height, hidden: height < 48 || rect.bottom <= bannerBottom };
  }

  function syncOverlay(postEl, overlay) {
    if (!postEl.isConnected) {
      overlay.remove();
      overlays.delete(postEl);
      return;
    }

    const { rect, top, height, hidden } = clipRect(postEl);
    if (hidden) {
      overlay.style.display = "none";
      return;
    }

    overlay.style.display = "flex";
    overlay.style.top = `${top}px`;
    overlay.style.left = `${rect.left}px`;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${height}px`;
  }

  function syncBadge(postEl, badge) {
    if (!postEl.isConnected) {
      badge.remove();
      badges.delete(postEl);
      return;
    }

    const { rect, top, hidden } = clipRect(postEl);
    if (hidden) {
      badge.style.display = "none";
      return;
    }

    badge.style.display = "flex";
    badge.style.top = `${top + 8}px`;
    badge.style.left = `${rect.right - 8}px`;
    badge.style.transform = "translateX(-100%)";
  }

  AIBlocker.syncOverlays = function syncOverlays() {
    for (const [postEl, overlay] of overlays) {
      syncOverlay(postEl, overlay);
    }
    for (const [postEl, badge] of badges) {
      syncBadge(postEl, badge);
    }
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

  function overlayMarkup(verdict) {
    const score = verdict?.ai_score ?? 0;
    const hit = verdict?.parametersHit ?? 0;
    const total = verdict?.parameterCount ?? 6;
    const reasoning =
      String(verdict?.reasoning || "").trim() ||
      "This post was covered without a full AI score.";
    const signals = (verdict?.signals_detected || []).slice(0, 4).filter(Boolean);
    const chips = signals.length
      ? `<ul class="ai-blocker-overlay__signals">${signals
          .map((signal) => `<li>${escapeHtml(signal)}</li>`)
          .join("")}</ul>`
      : "";

    return `
      <div class="ai-blocker-overlay__card">
        <p class="ai-blocker-overlay__kicker">AI Blocker</p>
        <p class="ai-blocker-overlay__title">AI detected</p>
        <p class="ai-blocker-overlay__why">${escapeHtml(reasoning)}</p>
        ${chips}
        <p class="ai-blocker-overlay__meta">Score ${escapeHtml(score)} · ${escapeHtml(hit)}/${escapeHtml(total)} parameters</p>
        <p class="ai-blocker-overlay__cta">Click to reveal this post</p>
      </div>
    `;
  }

  AIBlocker.showScoreBadge = function showScoreBadge(postEl, verdict) {
    AIBlocker.ensureOverlayHost();

    const score = verdict?.ai_score ?? 0;
    const hit = verdict?.parametersHit ?? 0;
    const total = verdict?.parameterCount ?? 5;
    const flagged = Boolean(verdict?.flagged);
    const tooltip = [verdict?.reasoning, (verdict?.signals_detected || []).join(", ")]
      .filter(Boolean)
      .join(" — ");

    let badge = badges.get(postEl);
    if (!badge || !badge.isConnected) {
      badge = document.createElement("div");
      badge.className = "ai-blocker-badge";
      badgeLayer.appendChild(badge);
      badges.set(postEl, badge);
    }

    badge.textContent = `${score}  ${hit}/${total}`;
    badge.classList.toggle("is-flagged", flagged);
    badge.setAttribute("title", tooltip || `AI score ${score}`);
    badge.setAttribute("aria-label", `AI score ${score}, ${hit} of ${total} parameters hit`);
    syncBadge(postEl, badge);
  };

  AIBlocker.coverPost = function coverPost(postEl, verdict) {
    AIBlocker.ensureOverlayHost();
    if (AIBlocker.hasOverlay(postEl)) {
      return;
    }

    const overlay = document.createElement("button");
    overlay.type = "button";
    overlay.className = "ai-blocker-overlay";
    overlay.setAttribute("aria-label", "AI detected. Click to see the post anyway.");
    overlay.innerHTML = overlayMarkup(verdict);

    overlay.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      overlay.remove();
      overlays.delete(postEl);
      AIBlocker.scanner.rememberDismissed(postEl);
    });
    overlay.addEventListener("mousedown", (event) => event.stopPropagation());

    layer.appendChild(overlay);
    overlays.set(postEl, overlay);
    syncOverlay(postEl, overlay);
  };

  window.addEventListener("scroll", () => AIBlocker.syncOverlays(), true);
  window.addEventListener("resize", () => AIBlocker.syncOverlays());
})();
