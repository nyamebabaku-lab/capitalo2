// Two Android apps: APP=tenant (default) → Capital O2 Hostel, APP=manager → Capital O2 Estates (owner + staff).
import type { CapacitorConfig } from '@capacitor/cli';

const APP = (process.env.APP || 'tenant') as 'tenant' | 'manager';
const META = {
  tenant: { id: 'com.capitalo2.hostel', name: 'Capital O2 Hostel' },
  manager: { id: 'com.capitalo2.estates', name: 'Capital O2 Estates' },
}[APP];

const config: CapacitorConfig = {
  appId: META.id,
  appName: META.name,
  webDir: `build/${APP}`,
  android: { path: `android-${APP}`, backgroundColor: '#1f5a23' },
  plugins: {
    SplashScreen: { launchShowDuration: 1500, launchAutoHide: true, backgroundColor: '#1f5a23', androidScaleType: 'CENTER_CROP', showSpinner: false },
    StatusBar: { backgroundColor: '#1f5a23', style: 'DARK' },
  },
};

export default config;
