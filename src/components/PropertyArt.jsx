// Drawn building illustrations used as property covers (no stock photos).
import { useState } from 'react';
import { cx } from './ui';

const SKIES = [
  ['#dbeafe', '#fef3c7'], ['#fde68a', '#fecaca'], ['#d1fae5', '#e0f2fe'], ['#ede9fe', '#fce7f3'], ['#fee2e2', '#fef9c3'], ['#cffafe', '#f5f5f4'],
];

// Capital O2's own photos (public/photos) used when a property has no uploaded photo.
const STOCK = { Apartments: 'front', 'Compound house': 'compound', Townhouses: 'cottage', Houses: 'house', Commercial: 'apartments2', Hostel: 'apartments2', 'Mixed use': 'airbnb' };
export const stockPhoto = (type) => `${import.meta.env.BASE_URL}photos/${STOCK[type] || 'front'}.jpg`;
/** The front picture: the owner's own upload (Settings → Branding) or Capital O2's default building photo. */
export const heroPhoto = (owner) => owner?.frontImage || `${import.meta.env.BASE_URL}photos/hero.jpg`;

export default function PropertyArt(props) {
  const [failed, setFailed] = useState(false);
  const src = props.photo || props.property?.photo || stockPhoto(props.property?.type);
  if (!failed) return <img src={src} alt={props.property?.name || ''} loading="lazy" onError={() => setFailed(true)} className={cx('h-full w-full object-cover', props.className)} />;
  return <Drawn {...props} />;
}

function Drawn({ property, className }) {
  const [a, b] = SKIES[(property?.hue ?? 0) % SKIES.length];
  const type = property?.type || 'Apartments';
  return (
    <svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" className={cx('h-full w-full', className)}>
      <defs>
        <linearGradient id={`sky${property?.id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={a} /><stop offset="1" stopColor={b} /></linearGradient>
      </defs>
      <rect width="320" height="180" fill={`url(#sky${property?.id})`} />
      <circle cx="262" cy="42" r="18" fill="#fbbf24" opacity=".8" />
      <path d="M0 150 Q80 132 160 146 T320 140 V180 H0Z" fill="#86efac" opacity=".55" />
      {type === 'Apartments' || type === 'Hostel' ? (
        <g>
          <rect x="92" y="38" width="96" height="118" rx="4" fill="rgb(var(--brand-700))" />
          <rect x="188" y="66" width="56" height="90" rx="4" fill="rgb(var(--brand-500))" />
          {[0, 1, 2, 3, 4].map((r) => [0, 1, 2].map((c) => <rect key={`${r}${c}`} x={104 + c * 28} y={50 + r * 20} width="16" height="11" rx="2" fill={(r + c) % 3 ? '#fde68a' : '#fff'} opacity=".9" />))}
          {[0, 1, 2].map((r) => [0, 1].map((c) => <rect key={`b${r}${c}`} x={198 + c * 22} y={78 + r * 22} width="12" height="12" rx="2" fill="#fff" opacity=".85" />))}
          <rect x="130" y="134" width="20" height="22" fill="rgb(var(--accent-400))" />
        </g>
      ) : type === 'Commercial' ? (
        <g>
          <rect x="60" y="70" width="200" height="86" rx="4" fill="rgb(var(--brand-700))" />
          <rect x="60" y="62" width="200" height="14" fill="rgb(var(--accent-400))" />
          {[0, 1, 2, 3].map((i) => <g key={i}><rect x={72 + i * 47} y={92} width="38" height="64" fill="#e0f2fe" opacity=".9" /><path d={`M${70 + i * 47} 84h42l-4 8h-34z`} fill={i % 2 ? '#ef4444' : '#fff'} opacity=".9" /></g>)}
        </g>
      ) : (
        <g>
          {[0, 1, 2].map((i) => (
            <g key={i} transform={`translate(${44 + i * 82} ${i === 1 ? 52 : 70})`}>
              <path d="M0 40 36 8 72 40Z" fill="rgb(var(--accent-500))" />
              <rect x="6" y="40" width="60" height={i === 1 ? 64 : 46} fill={i === 1 ? 'rgb(var(--brand-700))' : 'rgb(var(--brand-500))'} />
              <rect x="14" y="50" width="14" height="12" rx="2" fill="#fff" opacity=".9" />
              <rect x="44" y="50" width="14" height="12" rx="2" fill="#fde68a" opacity=".9" />
              <rect x="29" y={i === 1 ? 82 : 66} width="14" height="22" fill="#fff" opacity=".8" />
            </g>
          ))}
        </g>
      )}
    </svg>
  );
}
