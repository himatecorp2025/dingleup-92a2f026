import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.1fe67fc55c88483eb2e59ea42baa3c0f',
  appName: 'DingleUP!',
  webDir: 'dist',
  server: {
    url: 'https://1fe67fc5-5c88-483e-b2e5-9ea42baa3c0f.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  ios: {
    // iOS Full Screen Immersive Mode - EDGE TO EDGE
    contentInset: 'automatic',
    allowsLinkPreview: false,
    scrollEnabled: false,
    // Use light content on dark backgrounds
    preferredContentMode: 'mobile',
    // CRITICAL: Enable edge-to-edge layout with safe area handling
    limitsNavigationsToAppBoundDomains: false,
    webContentsDebuggingEnabled: true
  },
  android: {
    // Android Full Screen Immersive Mode
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true,
    // Hide system bars (status bar + navigation bar)
    backgroundColor: '#000000'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
      backgroundColor: '#000000',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      androidSpinnerStyle: 'large',
      iosSpinnerStyle: 'small',
      spinnerColor: '#9333ea',
      splashFullScreen: true,
      splashImmersive: true
    },
    StatusBar: {
      // iOS & Android - Hide status bar completely
      style: 'dark',
      backgroundColor: '#000000',
      overlaysWebView: true
    }
  }
};

export default config;
