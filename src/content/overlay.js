var AIBlocker = AIBlocker || {};

(function () {
  const CSS = `
    :host {
      all: initial;
    }
    .layer {
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 2147483646;
    }
    .ai-blocker-overlay {
      position: absolute;
      box-sizing: border-box;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0;
      padding: 24px;
      border: 0;
      background: #c41e3a;
      color: #fff;
      pointer-events: auto;
      cursor: pointer;
      user-select: none;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      text-align: center;
    }
    .ai-blocker-overlay__content {
      max-width: 28rem;
      pointer-events: none;
    }
    .ai-blocker-overlay__title {
      margin: 0 0 12px;
      font-size: 1.75rem;
      font-weight: 800;
      letter-spacing: 0.04em;
    }
    .ai-blocker-overlay p {
      margin: 0 0 10px;
      font-size: 1rem;
      line-height: 1.4;
    }
    .ai-blocker-overlay__cta {
      margin-top: 16px;
      font-weight: 700;
      text-decoration: underline;
    }
  `;

  const overlays = new Map();
  let host = null;
  let shadow = null;
  let layer = null;

  function createHost() {
    host = document.createElement("div");
    host.setAttribute("data-ai-blocker", "host");
    host.style.cssText = "position:fixed;inset:0;z-index:2147483646;pointer-events:none;";
    shadow = host.attachShadow({ mode: "closed" });

    const style = document.createElement("style");
    style.textContent = CSS;
    layer = document.createElement("div");
    layer.className = "layer";
    shadow.append(style, layer);

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
      mountHost();
    }
  };

  function syncOverlay(postEl, overlay) {
    if (!postEl.isConnected) {
      overlay.remove();
      overlays.delete(postEl);
      return;
    }

    const rect = postEl.getBoundingClientRect();
    overlay.style.top = `${rect.top}px`;
    overlay.style.left = `${rect.left}px`;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${Math.max(rect.height, 80)}px`;
  }

  AIBlocker.syncOverlays = function syncOverlays() {
    for (const [postEl, overlay] of overlays) {
      syncOverlay(postEl, overlay);
    }
  };

  AIBlocker.hasOverlay = function hasOverlay(postEl) {
    const overlay = overlays.get(postEl);
    return Boolean(overlay && overlay.isConnected);
  };

  AIBlocker.coverPost = function coverPost(postEl) {
    AIBlocker.ensureOverlayHost();
    if (AIBlocker.hasOverlay(postEl)) {
      return;
    }

    const overlay = document.createElement("button");
    overlay.type = "button";
    overlay.className = "ai-blocker-overlay";
    overlay.setAttribute("aria-label", "AI detected. Click to see the post anyway.");
    overlay.innerHTML = `
      <div class="ai-blocker-overlay__content">
        <p class="ai-blocker-overlay__title">AI DETECTED 🤖</p>
        <p>We have scanned this post and determined that this is AI.</p>
        <p>We covered up the post to protect you from the AI.</p>
        <p class="ai-blocker-overlay__cta">Click to see the post anyways.</p>
      </div>
    `;

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
