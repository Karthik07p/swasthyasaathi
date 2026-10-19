import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.swasthyasaathi.app',
  appName: 'SwasthyaSaathi',
  webDir: 'dist',
  android: {
    // The backend is served over HTTPS; block mixed content in the WebView
    allowMixedContent: false,
  },
};

export default config;
