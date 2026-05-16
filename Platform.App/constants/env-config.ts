import Constants from 'expo-constants';

export function getDevServerOrigin(): string {
  const hostUri = Constants.expoConfig?.hostUri || Constants.manifest?.hostUri;
  if (hostUri) {
    return `http://${hostUri}`;
  }
  return 'http://localhost:8081';
}

export const APIGATEWAY_URL = 'http://localhost:15000';
