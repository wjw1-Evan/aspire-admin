import Constants from 'expo-constants';

export function getDevServerOrigin(): string {
  // Method 1: RN internal getDevServer (works in RN 0.83+ / Fabric)
  try {
    const getDevServer = require('react-native/Libraries/Core/Devtools/getDevServer').default;
    const devServer = getDevServer();
    if (devServer?.url && devServer.bundleLoadedFromServer) {
      return devServer.url.replace(/\/$/, '');
    }
  } catch {}

  // Method 2: NativeModules.SourceCode (legacy RN)
  try {
    const { NativeModules } = require('react-native');
    const scriptURL = NativeModules.SourceCode?.scriptURL;
    if (scriptURL) {
      const origin = scriptURL.split('/').slice(0, 3).join('/');
      if (origin.startsWith('http://') || origin.startsWith('https://')) {
        return origin;
      }
    }
  } catch {}

  // Method 3: Constants.hostUri (Expo managed workflow)
  try {
    const hostUri = Constants.expoConfig?.hostUri || Constants.manifest?.hostUri;
    if (hostUri) {
      return `http://${hostUri}`;
    }
  } catch {}

  // Fallback: Aspire AppHost fixed port 18000
  return 'http://localhost:18000';
}

export const APIGATEWAY_URL = 'http://localhost:15000';
