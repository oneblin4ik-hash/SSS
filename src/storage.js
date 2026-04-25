const SSStorage = (() => {
  const PREFIX = "serbolin.v1.";

  return {
    get(k, fallback) {
      try {
        const raw = localStorage.getItem(PREFIX + k);
        return raw == null ? fallback : JSON.parse(raw);
      } catch { return fallback; }
    },
    set(k, v) { localStorage.setItem(PREFIX + k, JSON.stringify(v)); },
    exportAll() {
      const out = {};
      for (let i = 0; i < localStorage.length; i++) {
        const fk = localStorage.key(i);
        if (fk && fk.startsWith(PREFIX)) {
          out[fk.slice(PREFIX.length)] = JSON.parse(localStorage.getItem(fk));
        }
      }
      return out;
    },
    importAll(obj) {
      Object.entries(obj || {}).forEach(([k, v]) => SSStorage.set(k, v));
    },
    resetAll() {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const fk = localStorage.key(i);
        if (fk && fk.startsWith(PREFIX)) keys.push(fk);
      }
      keys.forEach(k => localStorage.removeItem(k));
    }
  };
})();
