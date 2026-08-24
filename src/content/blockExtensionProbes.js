(function () {
  const PREFIX = "chrome-extension://";

  function isExtensionProbe(value) {
    if (typeof value === "string") {
      return value.startsWith(PREFIX);
    }
    if (value instanceof URL) {
      return value.protocol === "chrome-extension:";
    }
    if (value && typeof value.url === "string") {
      return value.url.startsWith(PREFIX);
    }
    return false;
  }

  function rejectProbe() {
    return Promise.reject(new TypeError("Failed to fetch"));
  }

  const realFetch = window.fetch.bind(window);

  function wrapFetch(fn) {
    return function (input) {
      if (isExtensionProbe(input)) {
        return rejectProbe();
      }
      return fn.apply(this, arguments);
    };
  }

  let currentFetch = wrapFetch(realFetch);

  Object.defineProperty(window, "fetch", {
    get() {
      return currentFetch;
    },
    set(nextFetch) {
      currentFetch = wrapFetch(typeof nextFetch === "function" ? nextFetch : realFetch);
    },
    configurable: true,
    enumerable: true,
  });

  const realOpen = XMLHttpRequest.prototype.open;
  const realSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url) {
    this._aiBlockerProbe = isExtensionProbe(url);
    if (this._aiBlockerProbe) {
      return;
    }
    return realOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function () {
    if (this._aiBlockerProbe) {
      queueMicrotask(() => this.dispatchEvent(new Event("error")));
      return;
    }
    return realSend.apply(this, arguments);
  };

  const imageSrc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "src");
  if (imageSrc && imageSrc.set) {
    const nativeSet = imageSrc.set;
    Object.defineProperty(HTMLImageElement.prototype, "src", {
      configurable: true,
      enumerable: true,
      get: imageSrc.get,
      set(value) {
        if (isExtensionProbe(value)) {
          queueMicrotask(() => this.dispatchEvent(new Event("error")));
          return;
        }
        nativeSet.call(this, value);
      },
    });
  }
})();
