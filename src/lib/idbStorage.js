// Saved app data lives in IndexedDB, not localStorage. All the apps on nyamebabaku-lab.github.io share one
// ~5 MB localStorage, which fills up once several demos have been opened; IndexedDB has far more room.
// Old localStorage copies move over (and are removed) on first read. Saving never crashes the app.
const DB = 'nyamebabaku-apps';
const STORE = 'kv';
let dbp = null;
function db() {
  if (!dbp) {
    dbp = new Promise((resolve, reject) => {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(STORE);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  }
  return dbp;
}
function run(mode, fn) {
  return db().then((d) => new Promise((resolve, reject) => {
    const t = d.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(req?.result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  }));
}
const ls = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); return true; } catch { return false; } },
  del: (k) => { try { localStorage.removeItem(k); } catch { /* blocked */ } },
};

export const idbStorage = {
  async getItem(name) {
    try {
      const v = await run('readonly', (s) => s.get(name));
      if (v != null) return v;
    } catch { return ls.get(name); }
    const old = ls.get(name);
    if (old != null) {
      try { await run('readwrite', (s) => s.put(old, name)); ls.del(name); } catch { /* keep old copy */ }
    }
    return old;
  },
  async setItem(name, value) {
    try { await run('readwrite', (s) => s.put(value, name)); ls.del(name); } catch { ls.set(name, value); }
  },
  async removeItem(name) {
    try { await run('readwrite', (s) => s.delete(name)); } catch { /* ignore */ }
    ls.del(name);
  },
};

/** Removes every saved key matching `test` (used by "Reset saved data"). */
export async function clearSaved(test) {
  try { Object.keys(localStorage).forEach((k) => test(k) && localStorage.removeItem(k)); } catch { /* blocked */ }
  try {
    const keys = await run('readonly', (s) => s.getAllKeys());
    await run('readwrite', (s) => keys.filter(test).forEach((k) => s.delete(k)));
  } catch { /* ignore */ }
}
