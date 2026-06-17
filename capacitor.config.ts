import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aeonsend.tracker',
  appName: "Aeon's End Tracker",
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;

