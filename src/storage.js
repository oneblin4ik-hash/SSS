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
    },

    // ── Cloud sync ─────────────────────────────────────────────────
    async loadFromCloud() {
      if (!SSConfig.workerUrl || SSConfig.workerUrl.startsWith("PASTE")) return null;
      try {
        const r = await fetch(SSConfig.workerUrl + "/api/state", {
          headers: { "Authorization": "Bearer " + SSConfig.token },
        });
        if (!r.ok) return null;
        const result = await r.json();
        if (!result || !result.data) return null;

        const localTs = SSStorage.get("_cloud_ts", 0);
        if (result.updated_at > localTs) {
          SSStorage.importAll(result.data);
          SSStorage.set("_cloud_ts", result.updated_at);
          return result.data;
        }
        return null;
      } catch (e) {
        console.warn("[SSS] Cloud load failed:", e.message);
        return null;
      }
    },

    async saveToCloud(data) {
      if (!SSConfig.workerUrl || SSConfig.workerUrl.startsWith("PASTE")) return;
      try {
        const r = await fetch(SSConfig.workerUrl + "/api/state", {
          method: "PUT",
          headers: {
            "Authorization": "Bearer " + SSConfig.token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ data }),
        });
        if (r.ok) {
          const res = await r.json();
          SSStorage.set("_cloud_ts", res.updated_at);
        }
      } catch (e) {
        console.warn("[SSS] Cloud save failed:", e.message);
      }
    },
  };
})();
