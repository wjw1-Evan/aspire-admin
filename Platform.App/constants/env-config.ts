import Constants from 'expo-constants';

export function getDevServerOrigin(): string {
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    return `http://${hostUri}`;
  }
  return 'http://localhost:18000';
}

export const APIGATEWAY_URL = 'http://localhost:15000';
