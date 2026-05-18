import Constants from 'expo-constants';

export function getDevServerOrigin(): string {
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    return `http://${hostUri}`;
  }
  if (__DEV__) {
    return 'http://localhost:18000';
  }
  throw new Error('Unable to determine API origin. Set EXPO_PUBLIC_API_BASE_URL in production.');
}
