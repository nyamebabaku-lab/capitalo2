// Owner branding → CSS variables. Each owner picks a brand colour, an accent colour, a heading font,
// corner style, sidebar style and light/dark mode; the whole app re-themes from these.

export const DEFAULT_THEME = {
  brand: '#2e7d32',
  accent: '#9bd21c',
  font: 'Fraunces',
  radius: 'rounded',
  sidebar: 'dark',
  dark: false,
};

export const FONTS = [
  { value: 'Fraunces', label: 'Classic', sample: 'Elegant serif' },
  { value: 'Sora', label: 'Modern', sample: 'Geometric sans' },
  { value: 'Plus Jakarta Sans', label: 'Clean', sample: 'Simple & friendly' },
];
export const RADII = { sharp: '0.5rem', rounded: '1rem', soft: '1.5rem' };
export const PRESETS = [
  { name: 'Capital O2 Green', brand: '#2e7d32', accent: '#9bd21c' },
  { name: 'Leaf', brand: '#3f8f10', accent: '#c6e83a' },
  { name: 'Earth', brand: '#6b4a2e', accent: '#8fd11a' },
  { name: 'Royal Blue', brand: '#1d4ed8', accent: '#f59e0b' },
  { name: 'Kente Gold', brand: '#7c4a03', accent: '#e2b232' },
  { name: 'Volta Teal', brand: '#0f766e', accent: '#f97316' },
  { name: 'Ashanti Wine', brand: '#881337', accent: '#d4a017' },
  { name: 'Midnight', brand: '#1e293b', accent: '#22c55e' },
  { name: 'Cocoa', brand: '#5b3a29', accent: '#c2410c' },
  { name: 'Purple Reign', brand: '#6d28d9', accent: '#facc15' },
];

const clamp = (n) => Math.max(0, Math.min(255, Math.round(n)));
export function hexToRgb(hex = '#000000') {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export const rgbToHex = ([r, g, b]) => `#${[r, g, b].map((v) => clamp(v).toString(16).padStart(2, '0')).join('')}`;
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

function luminance(rgb) {
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export const contrastWithWhite = (hex) => 1.05 / (luminance(hexToRgb(hex)) + 0.05);

/** Darkens a colour until white text on it is readable (contrast ≥ 4.5). Returns { hex, changed }. */
export function readable(hex) {
  let rgb = hexToRgb(hex);
  let changed = false;
  for (let i = 0; i < 30 && 1.05 / (luminance(rgb) + 0.05) < 4.5; i++) {
    rgb = mix(rgb, [0, 0, 0], 0.08);
    changed = true;
  }
  return { hex: rgbToHex(rgb), changed };
}

// The chosen colour sits at shade 600 (buttons, active states).
const STEPS = { 50: ['w', 0.92], 100: ['w', 0.84], 200: ['w', 0.68], 300: ['w', 0.5], 400: ['w', 0.3], 500: ['w', 0.13], 600: ['w', 0], 700: ['b', 0.18], 800: ['b', 0.32], 900: ['b', 0.45], 950: ['b', 0.64] };
export function scale(hex) {
  const base = hexToRgb(hex);
  return Object.fromEntries(Object.entries(STEPS).map(([k, [to, t]]) => [k, mix(base, to === 'w' ? [255, 255, 255] : [0, 0, 0], t).map(clamp)]));
}

/** Applies a theme to the document (CSS variables + dark class + font + radius). */
export function applyTheme(t = DEFAULT_THEME) {
  const theme = { ...DEFAULT_THEME, ...t };
  const root = document.documentElement;
  for (const [name, hex] of [['brand', readable(theme.brand).hex], ['accent', theme.accent]]) {
    Object.entries(scale(hex)).forEach(([k, rgb]) => root.style.setProperty(`--${name}-${k}`, rgb.join(' ')));
  }
  root.style.setProperty('--font-display', `'${theme.font}'`);
  root.style.setProperty('--radius', RADII[theme.radius] || RADII.rounded);
  root.classList.toggle('dark', !!theme.dark);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme.dark ? '#0a0f0d' : rgbToHex(scale(readable(theme.brand).hex)[800]));
}

/** A simple monogram logo (SVG data URL) used for seeded companies. */
export function monogramLogo(text, brand = '#0f604a', accent = '#c99a1e') {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" rx="28" fill="${brand}"/><path d="M60 22 22 52h10v40h56V52h10z" fill="none" stroke="${accent}" stroke-width="7" stroke-linejoin="round"/><text x="60" y="84" text-anchor="middle" font-family="Georgia,serif" font-size="30" font-weight="700" fill="#fff">${text}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
