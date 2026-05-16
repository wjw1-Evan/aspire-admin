import Constants from 'expo-constants';
import { NativeModules } from 'react-native';

export function getDevServerOrigin(): string {
  // Method 1: Extract from bundle URL (most reliable in Expo Go)
  try {
    const scriptURL = NativeModules.SourceCode?.scriptURL;
    if (scriptURL) {
      const origin = scriptURL.split('/').slice(0, 3).join('/');
      if (origin.startsWith('http://') || origin.startsWith('https://')) {
        return origin;
      }
    }
  } catch {}

  // Method 2: Constants.hostUri (works in some Expo SDK versions)
  try {
    const hostUri = Constants.expoConfig?.hostUri || Constants.manifest?.hostUri;
    if (hostUri) {
      return `http://${hostUri}`;
    }
  } catch {}

  // Fallback
  return 'http://localhost:8081';
}

export const APIGATEWAY_URL = 'http://localhost:15000';
