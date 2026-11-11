// Capital O2 Estates & Hostel — one company and its tenants (independent of Efie Wura Pro).
// Which build: 'live' (real accounts, Supabase schema "capitalo2") or 'demo' (sample data in the browser).
export const MODE = import.meta.env.VITE_APP || 'demo';
export const LIVE = MODE === 'live';
export const SITE = 'https://nyamebabaku-lab.github.io/capitalo2/';
export const DEMO_SITE = `${SITE}demo/`;
/** Phone-only accounts sign in with this stand-in email behind the scenes. */
export const PHONE_DOMAIN = 'phone.capitalo2.app';
/** The company's join code (tenants/staff are matched by phone, so nobody types it). */
export const COMPANY_CODE = 'CAPO2';
export const COMPANY = 'Capital O2 Estates & Hostel';

/** Android apps: 'tenant' | 'manager' (owner + staff). Empty on the website (everyone). */
export const APP_ROLE = import.meta.env.VITE_ROLE || '';
export const IS_NATIVE = typeof window !== 'undefined' && !!window.Capacitor?.isNativePlatform?.();
const RELEASES = 'https://github.com/nyamebabaku-lab/capitalo2/releases/latest/download/';
export const APKS = {
  tenant: { name: 'Capital O2 Hostel', who: 'Tenants', url: `${RELEASES}CapitalO2-Hostel.apk` },
  manager: { name: 'Capital O2 Estates', who: 'Owner, managers & caretakers', url: `${RELEASES}CapitalO2-Estates.apk` },
};
/** Which app a signed-in role belongs to. */
export const appForRole = (role) => (role === 'tenant' ? 'tenant' : 'manager');
export const APP_NAME = APP_ROLE ? APKS[APP_ROLE].name : COMPANY;
