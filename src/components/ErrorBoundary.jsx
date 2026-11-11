// Never a blank page: if the app crashes, show what happened and a way out (reload, or clear saved data).
import { Component } from 'react';

/** Removes this app's saved data, offline copy and service worker, then reloads. */
export async function clearAndReload() {
  try {
    const base = new URL('.', window.location.href).href;
    Object.keys(localStorage).forEach((k) => { if (/-(demo|live|pro)$/.test(k)) localStorage.removeItem(k); });
    if ('serviceWorker' in navigator) for (const r of await navigator.serviceWorker.getRegistrations()) if (r.scope === base) await r.unregister();
    if (window.caches) for (const k of await caches.keys()) if (k.includes(base)) await caches.delete(k);
  } catch { /* keep going */ }
  window.location.replace(window.location.href.split('#')[0]);
}

export default class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error('App crashed:', error, info?.componentStack); }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'system-ui, sans-serif', background: '#f7f7f2' }}>
        <div style={{ maxWidth: 420, background: '#fff', borderRadius: 20, padding: 28, boxShadow: '0 10px 30px rgba(0,0,0,.08)', textAlign: 'center' }}>
          <p style={{ fontSize: 40, margin: 0 }}>⚠️</p>
          <h1 style={{ fontSize: 22, margin: '8px 0' }}>Something went wrong</h1>
          <p style={{ color: '#666', fontSize: 14 }}>The app hit a problem on this device. Reloading usually fixes it. If not, reset the saved data (sample/demo changes on this device are removed; your live account is safe).</p>
          <p style={{ color: '#b91c1c', fontSize: 12, background: '#fef2f2', borderRadius: 10, padding: 8, wordBreak: 'break-word' }}>{String(this.state.error?.message || this.state.error)}</p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
            <button type="button" onClick={() => window.location.reload()} style={{ padding: '10px 16px', borderRadius: 12, border: '1px solid #ddd', background: '#fff', fontWeight: 600 }}>Reload</button>
            <button type="button" onClick={clearAndReload} style={{ padding: '10px 16px', borderRadius: 12, border: 0, background: '#166534', color: '#fff', fontWeight: 600 }}>Reset saved data</button>
          </div>
        </div>
      </div>
    );
  }
}
